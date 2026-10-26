"""End-to-end verification of a running AuraBI stack, against the real services.

    docker compose run --rm verify

Checks, in order: API health, the bank database (row counts and every data-quality check
against its expected value), Zetaris (SELECT 1 and a query on the bank data), NVIDIA
Nemotron (model list and a completion), then the business flow: a pipeline, a chat
question answered from Zetaris data, the analysis agent and the insights page.
Exits non-zero if any check fails.
"""

import asyncio
import os
import sys
import time
from typing import Any, Callable

import asyncpg
import httpx

from app.analysis.config import AnalysisSettings
from app.analysis.data import ZetarisClient
from app.analysis.model import NemotronClient

API = os.environ.get("AURABI_API_URL", "http://backend:8000")
results: list[tuple[str, bool]] = []


def check(name: str, fn: Callable[[], str]) -> Any:
    started = time.perf_counter()
    try:
        detail = fn()
        ok = True
    except Exception as exc:  # noqa: BLE001 - every failure is reported, not hidden
        detail = f"{type(exc).__name__}: {exc}"
        ok = False
    elapsed = time.perf_counter() - started
    print(f"  {'PASS' if ok else 'FAIL'}  {name}  ({elapsed:.1f}s)")
    if detail:
        for line in str(detail).splitlines():
            print(f"        {line}")
    results.append((name, ok))
    return ok


# --- database ------------------------------------------------------------------------------
def database_checks() -> str:
    async def run() -> str:
        conn = await asyncpg.connect(
            host="db",
            user=os.environ.get("POSTGRES_USER", "datapipe"),
            password=os.environ.get("POSTGRES_PASSWORD", "datapipe"),
            database=os.environ.get("POSTGRES_DB", "datapipe"),
        )
        try:
            counts = await conn.fetch(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'bank' AND table_type = 'BASE TABLE' ORDER BY table_name"
            )
            lines = []
            for row in counts:
                n = await conn.fetchval(f'SELECT count(*) FROM bank."{row["table_name"]}"')
                lines.append(f"{row['table_name']:<14} {n:>8,}")
            catalog = await conn.fetch(
                "SELECT check_id, issue, detection_sql, expected_count FROM bank_meta.data_quality_catalog ORDER BY check_id"
            )
            mismatches = []
            for row in catalog:
                actual = await conn.fetchval(row["detection_sql"])
                flag = "ok" if actual == row["expected_count"] else "MISMATCH"
                lines.append(f"{row['check_id']}  {actual:>5} found / {row['expected_count']:>5} expected  {flag}  {row['issue']}")
                if actual != row["expected_count"]:
                    mismatches.append(row["check_id"])
            if mismatches:
                raise AssertionError("data-quality checks differ: " + ", ".join(mismatches) + "\n" + "\n".join(lines))
            return "\n".join(lines)
        finally:
            await conn.close()

    return asyncio.run(run())


def main() -> int:
    settings = AnalysisSettings()
    db = settings.zetaris_bank_database
    http = httpx.Client(base_url=API, timeout=300)
    state: dict[str, Any] = {}

    print("AuraBI — end-to-end verification")
    print("================================\n")

    print("API")
    def health() -> str:
        body = http.get("/health").raise_for_status().json()
        assert body["status"] == "ok", body
        assert body["llm_configured"], "NVIDIA_API_KEY / NVIDIA_MODEL missing in .env"
        assert body["zetaris_configured"], "Zetaris credentials missing in .env"
        return f"provider={body['provider']} model={body['model']} zetaris={body['zetaris_mode']}:{body['zetaris_database']}"
    check("GET /health", health)

    print("\nDatabase (PostgreSQL, schema bank)")
    check("row counts and data-quality answer key", database_checks)

    print("\nZetaris")
    zetaris = ZetarisClient.from_settings(settings)
    check("SELECT 1 through Zetaris", lambda: f"rows={zetaris.run_sql('SELECT 1 AS ok', limit=10)}")
    check(
        f"bank data through Zetaris ({db})",
        lambda: "\n".join(
            f"{r['country_code']}: {r['customers']} customers"
            for r in zetaris.run_sql(
                f"SELECT country_code, count(*) AS customers FROM {db}.customers GROUP BY country_code ORDER BY country_code",
                limit=10,
            )
        ),
    )

    print("\nNVIDIA Nemotron")
    base_url, api_key, model = settings.active_model_config

    def models() -> str:
        assert api_key, "NVIDIA_API_KEY is empty in .env (free key: https://build.nvidia.com)"
        response = httpx.get(f"{base_url.rstrip('/')}/models", headers={"Authorization": f"Bearer {api_key}"}, timeout=60)
        response.raise_for_status()
        ids = {m.get("id") for m in response.json().get("data", [])}
        assert model in ids, f"{model} is not offered by {base_url} for this key"
        return f"{model} available ({len(ids)} models on the route)"
    check("model list", models)

    def completion() -> str:
        assert api_key, "NVIDIA_API_KEY is empty in .env"
        reply = NemotronClient(base_url, api_key, model, provider=settings.model_provider).chat(
            [{"role": "user", "content": "Bonjour, réponds en une phrase."}]
        )
        text = (reply.choices[0].message.content or "").strip()
        assert text, "empty completion"
        return text[:300]
    check("chat completion", completion)

    print("\nBusiness flow")
    def pipeline() -> str:
        body = http.post("/api/v1/pipelines", json={"name": "Vérification de bout en bout"}).raise_for_status().json()
        state["pipeline"] = body["id"]
        return f"pipeline {body['id']}"
    check("create pipeline", pipeline)

    def chat() -> str:
        question = "Combien de clients la banque a-t-elle dans chaque pays ? Donne les chiffres exacts."
        body = http.post(f"/api/v1/pipelines/{state['pipeline']}/chat", json={"content": question}).raise_for_status().json()
        message = body["agent_message"]
        trace = (message.get("metadata") or {}).get("trace") or {}
        runs = [r for r in trace.get("sql_executions", []) if not r.get("error")]
        assert runs, f"the agent answered without querying Zetaris: {message['content_md'][:300]}"
        return f"SQL: {runs[-1]['sql']}\nrows: {runs[-1].get('preview')}\nanswer: {message['content_md'][:400]}"
    check("chat answered from Zetaris data", chat)

    def agent_query() -> str:
        body = http.post("/api/v1/agent/query", json={"question": "Quel est le montant total des pertes de fraude confirmées, par type ?"}).raise_for_status().json()
        assert body["sources"] == ["Zetaris"] and body["calculations"], f"no Zetaris evidence: {body.get('warnings')}"
        return f"SQL: {body['sql']}\nevidence rows: {len(body['calculations'])}\nanswer: {body['response'][:400]}"
    check("POST /agent/query", agent_query)

    def insights() -> str:
        body = http.get(f"/api/v1/pipelines/{state['pipeline']}/insights").raise_for_status().json()
        cards = ", ".join(f"{c['label']} {c['value']}" for c in body["summaryCards"])
        return f"{len(body['insights'])} charts; {cards}"
    check("insights computed by Zetaris", insights)

    failed = [name for name, ok in results if not ok]
    print()
    if failed:
        print(f"{len(failed)} of {len(results)} checks failed: {', '.join(failed)}")
        return 1
    print(f"All {len(results)} checks passed — AuraBI is running on real Zetaris and Nemotron.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
