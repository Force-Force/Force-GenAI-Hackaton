"""Create the demo pipeline on an empty install, through the public API.

    python -m app.cli.seed_demo        (docker compose service `demo-seed`)

Does nothing when a pipeline already exists. The sources point at the real bank tables
(columns read from PostgreSQL), and the first chat message is answered by Nemotron with
Zetaris data, so a new user opens a populated workspace backed by real services.
"""

import asyncio
import os
import sys

import asyncpg
import httpx

API = os.environ.get("AURABI_API_URL", "http://backend:8000") + "/api/v1"
FOREIGN_KEYS = {"account_id", "card_id", "merchant_id", "customer_id", "branch_id", "loan_id", "transaction_id"}

CLEANING_SQL = """-- Normalise every amount to EUR and remove records that cannot be trusted
SELECT DISTINCT ON (t.account_id, t.txn_ts, t.amount, t.merchant_id)
       t.transaction_id, t.account_id, t.card_id, t.txn_ts, t.amount_eur,
       t.channel, t.status, t.country_code AS txn_country,
       m.category AS merchant_category, m.risk_level AS merchant_risk
FROM bank.transactions t
LEFT JOIN bank.merchants m ON m.merchant_id = t.merchant_id
WHERE t.amount > 0                          -- negative amounts are posting errors
  AND t.txn_ts < TIMESTAMP '2026-01-01'     -- future-dated rows are rejected
ORDER BY t.account_id, t.txn_ts, t.amount, t.merchant_id, t.transaction_id"""

FRAUD_PYTHON = """import pandas as pd

def transform(df: pd.DataFrame) -> pd.DataFrame:
    \"\"\"Rule-based fraud score (0-100) explained by its signals.\"\"\"
    hour = pd.to_datetime(df["txn_ts"]).dt.hour
    signals = pd.DataFrame({
        "night": hour.between(0, 4),
        "high_risk_merchant": df["merchant_risk"].eq("HIGH"),
        "card_not_present": df["channel"].eq("CARD_ONLINE"),
        "large_amount": df["amount_eur"] > 900,
    })
    weights = {"night": 25, "high_risk_merchant": 30, "card_not_present": 15, "large_amount": 30}
    df["fraud_score"] = sum(signals[name] * w for name, w in weights.items())
    df["fraud_signals"] = signals.apply(lambda r: ",".join(k for k, v in r.items() if v), axis=1)
    return df[df["fraud_score"] >= 55]"""

KYC_SQL = """-- Customers that must be reviewed by compliance before further activity
SELECT c.customer_id, c.segment, c.kyc_status, c.risk_rating,
       (c.email IS NULL OR c.email !~ '^[^@\\s]+@[^@\\s]+\\.[a-z]{2,}$') AS invalid_email,
       age(DATE '2025-12-31', c.birth_date) < INTERVAL '18 years'     AS is_minor
FROM bank.customers c
WHERE c.kyc_status IN ('REJECTED', 'EXPIRED', 'PENDING')
   OR c.email IS NULL
   OR age(DATE '2025-12-31', c.birth_date) < INTERVAL '18 years'"""

FIRST_QUESTION = "Quels types de fraude coûtent le plus cher à la banque, et pour quel montant ?"


def log(message: str) -> None:
    print(f"[demo-seed] {message}", flush=True)


async def table_columns(tables: list[str]) -> dict[str, list[dict]]:
    conn = await asyncpg.connect(
        host="db",
        user=os.environ.get("POSTGRES_USER", "datapipe"),
        password=os.environ.get("POSTGRES_PASSWORD", "datapipe"),
        database=os.environ.get("POSTGRES_DB", "datapipe"),
    )
    try:
        out: dict[str, list[dict]] = {}
        for table in tables:
            rows = await conn.fetch(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_schema = 'bank' AND table_name = $1 ORDER BY ordinal_position",
                table,
            )
            primary_key = f"{table.rstrip('s')}_id"
            out[table] = [
                {
                    "name": r["column_name"],
                    "type": r["data_type"],
                    "isPrimaryKey": r["column_name"] == primary_key,
                    "isForeignKey": r["column_name"] in FOREIGN_KEYS and r["column_name"] != primary_key,
                }
                for r in rows
            ]
        return out
    finally:
        await conn.close()


def source(label: str, table: str, description: str, columns: list[dict], x: int, y: int) -> dict:
    return {
        "type": "SOURCE",
        "subtype": "generic",
        "label": label,
        "position": {"x": x, "y": y},
        "status": "IDLE",
        "data": {
            "category": "resource", "kind": "source", "format": "postgresql", "warehouseRole": "source",
            "label": label, "description": description, "columns": columns,
            "use_app_database": True, "schema": "bank", "table": table,
        },
    }


def processing(label: str, language: str, code: str, description: str, inputs: list[str], outputs: list[str], x: int, y: int) -> dict:
    return {
        "type": "TRANSFORM",
        "subtype": "python_script" if language == "python" else "sql_query",
        "label": label,
        "position": {"x": x, "y": y},
        "status": "IDLE",
        "data": {
            "category": "processing", "language": language, "engine": language,
            "label": label, "description": description, "code": code,
            "inputColumns": inputs, "outputColumns": outputs,
        },
    }


def main() -> int:
    http = httpx.Client(base_url=API, timeout=300)
    if http.get("/pipelines").raise_for_status().json():
        log("pipelines already exist; nothing to do")
        return 0

    cols = asyncio.run(table_columns(["transactions", "customers", "merchants"]))
    pipeline = http.post("/pipelines", json={"name": "Démo — Banque AuraBI : fraude & conformité"}).raise_for_status().json()
    pid = pipeline["id"]
    log(f"pipeline {pid}")

    nodes = {
        "transactions": source("Transactions", "transactions", "263 000 opérations 2024-2025 (carte, virement, mobile money, salaires).", cols["transactions"], 0, 0),
        "merchants": source("Commerçants", "merchants", "400 commerçants, catégorie MCC et niveau de risque.", cols["merchants"], 0, 300),
        "customers": source("Clients", "customers", "6 000 clients, segment, KYC et données personnelles (RGPD).", cols["customers"], 0, 600),
        "cleaning": processing(
            "Nettoyage & conversion EUR", "sql", CLEANING_SQL,
            "Dédoublonne, rejette montants négatifs et dates futures, joint le risque commerçant.",
            ["transaction_id", "amount", "txn_ts", "merchant_id"],
            ["transaction_id", "amount_eur", "merchant_category", "merchant_risk"], 420, 120,
        ),
        "fraud": processing(
            "Score de fraude", "python", FRAUD_PYTHON,
            "Score explicable : nuit, commerçant à risque, carte non présente, montant élevé.",
            ["txn_ts", "amount_eur", "channel", "merchant_risk"], ["fraud_score", "fraud_signals"], 840, 120,
        ),
        "kyc": processing(
            "Contrôles qualité KYC", "sql", KYC_SQL,
            "Isole les clients à revoir : KYC non valide, e-mail invalide, mineurs.",
            ["customer_id", "email", "birth_date", "kyc_status"], ["customer_id", "invalid_email", "is_minor"], 420, 600,
        ),
        "warehouse": {
            "type": "SINK", "subtype": "postgres_sink", "label": "Entrepôt analytique",
            "position": {"x": 1260, "y": 360}, "status": "IDLE",
            "data": {
                "category": "datamart", "containerKind": "warehouse", "label": "Entrepôt analytique",
                "description": "Modèle en étoile : faits transactions et alertes, dimensions client et commerçant.",
                "expanded": False,
            },
        },
    }
    ids = {key: http.post(f"/pipelines/{pid}/nodes", json=body).raise_for_status().json()["id"] for key, body in nodes.items()}
    for src, dst in [("transactions", "cleaning"), ("merchants", "cleaning"), ("cleaning", "fraud"),
                     ("customers", "kyc"), ("fraud", "warehouse"), ("kyc", "warehouse")]:
        http.post(f"/pipelines/{pid}/edges", json={"source_node_id": ids[src], "target_node_id": ids[dst]}).raise_for_status()
    http.patch(f"/pipelines/{pid}", json={"architecture_design": {
        "model_type": "STAR", "scd_type": "TYPE_2",
        "justification": "Faits transactions et alertes fraude, dimensions client, commerçant et temps.",
    }}).raise_for_status()
    log(f"canvas: {len(ids)} nodes, 6 links")

    log(f"first AI question: {FIRST_QUESTION}")
    reply = http.post(f"/pipelines/{pid}/chat", json={"content": FIRST_QUESTION})
    if reply.is_error:
        log(f"ERROR: the AI conversation could not be created ({reply.status_code}): {reply.text[:300]}")
        return 1
    message = reply.json()["agent_message"]
    if (message.get("metadata") or {}).get("status") == "failed":
        log(f"ERROR: {message['content_md'][:300]}")
        return 1
    log("answered by Nemotron from Zetaris data")
    return 0


if __name__ == "__main__":
    sys.exit(main())
