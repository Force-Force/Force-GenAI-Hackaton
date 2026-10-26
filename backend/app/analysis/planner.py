"""Planner agent: Nemotron designs a pipeline plan from the user's request and the live
Zetaris catalog, and every proposed KPI is measured on Zetaris before it is shown."""

import json
import re
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from app.analysis.catalog import describe_database
from app.analysis.data import ZetarisClient, ZetarisError
from app.analysis.model import NemotronClient

PLANNER_PROMPT = """Tu es l'agent Architecte d'AuraBI. Tu conçois des pipelines de données
gouvernés pour une banque, à partir de la demande de l'utilisateur et du catalogue réel
exposé par Zetaris ci-dessous.

Catalogue Zetaris (base `{database}`, dialecte Spark SQL) :
{catalog}

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :
{{
  "title": "titre court du pipeline",
  "summary": "2 ou 3 phrases : objectif, sources, livrable",
  "stages": [
    {{"title": "...", "category": "Ingestion|Qualité|Transformation|Modélisation|Gouvernance|Restitution",
      "description": "ce que fait l'étape et pourquoi", "tables": ["{database}.table"],
      "technologies": ["Zetaris", "PostgreSQL", "SQL", "Python"]}}
  ],
  "reasoning": [
    {{"title": "...", "reasoning": "pourquoi ce choix, en s'appuyant sur le catalogue",
      "sql": "requête de lecture illustrative (optionnelle)"}}
  ],
  "kpis": [
    {{"id": "identifiant_snake_case", "name": "...", "category": "Finance|Customer|Integrity|Custom",
      "description": "...", "sql": "SELECT <expression> AS value FROM {database}.<table> ...",
      "target_mart": "mart_...", "business_impact": "..."}}
  ],
  "questions": [
    {{"question": "décision d'architecture à faire valider", "context": "pourquoi elle compte",
      "options": ["option A", "option B"], "recommended": "option A"}}
  ],
  "compiled_sql": "DDL du mart cible (CREATE VIEW ... AS SELECT ...)"
}}

Contraintes :
- 4 à 6 étapes, 3 à 5 KPI, 2 ou 3 questions de 2 à 4 options chacune ;
- un KPI est UN chiffre global sur tout le périmètre : son SQL renvoie UNE ligne et UNE
  colonne numérique nommée value, SANS GROUP BY ; la ventilation (par agence, par mois…)
  se décrit dans les étapes et le mart, pas dans le KPI ;
- le SQL est en lecture seule et n'utilise que les tables et colonnes du catalogue, préfixées
  par `{database}.`, avec les valeurs exactes indiquées par ∈ {{...}} ;
- le nom du KPI décrit exactement ce que calcule le SQL : un « taux » ou un « ratio » est une
  division exprimée en %, un « total » est une somme, un « nombre » est un comptage ;
- n'additionne jamais des montants de devises différentes : utilise les colonnes *_eur
  (amount_eur, loss_amount_eur…) ou convertis avec fx_rates ;
- les KPI mesurent des choses différentes ;
- seuls les noms de tables et colonnes restent tels quels, tout le reste suit la langue imposée.
"""

FIX_SQL_PROMPT = """Cette requête Spark SQL exécutée sur Zetaris a échoué.
Requête : {sql}
Erreur : {error}
Catalogue :
{catalog}
Le KPI est UN chiffre global : agrège tout le périmètre, sans GROUP BY, en une seule colonne
numérique nommée value, avec les valeurs exactes indiquées par ∈ {{...}}.
Renvoie UNIQUEMENT la requête corrigée, sans commentaire."""

_FATAL = {"authentication", "authorization", "transport", "timeout", "rate_limit"}
_KPI_CATEGORIES = {"Finance", "Customer", "Integrity", "Custom"}


def _content(completion: Any) -> str:
    text = completion.choices[0].message.content or ""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.S).strip()


def _parse_json(text: str) -> dict[str, Any]:
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("aucun objet JSON dans la réponse")
    return json.loads(text[start : end + 1])


def _strip_sql(text: str) -> str:
    return re.sub(r"^```(?:sql)?\s*|\s*```$", "", text.strip()).strip().rstrip(";")


def _format(value: Any) -> str:
    if isinstance(value, bool) or value is None:
        return str(value)
    if isinstance(value, (int, float)):
        decimals = 0 if float(value).is_integer() else 2
        return f"{value:,.{decimals}f}".replace(",", " ")
    return str(value)


_FRENCH = re.compile(r"[éèêàùçôî]|\b(le|la|les|des|du|une?|pour|par|avec|et|de|dans|sur)\b", re.IGNORECASE)


def _is_french(text: str) -> bool:
    return len(_FRENCH.findall(text)) >= 2


class PlannerAgent:
    def __init__(self, zetaris: ZetarisClient, llm: NemotronClient, database: str) -> None:
        self.zetaris = zetaris
        self.llm = llm
        self.database = database

    def _design(self, prompt: str, catalog: str) -> dict[str, Any]:
        language = "français" if _is_french(prompt) else "English"
        messages = [
            {"role": "system", "content": PLANNER_PROMPT.format(database=self.database, catalog=catalog)
             + f"\nLangue de rédaction imposée pour tout le JSON : {language}."},
            {"role": "user", "content": prompt},
        ]
        # Full reasoning here: it is what keeps KPI names, units and currencies consistent.
        reply = _content(self.llm.chat(messages, temperature=0.3, timeout=240))
        try:
            return _parse_json(reply)
        except (ValueError, json.JSONDecodeError) as exc:
            # One correction round: show the model why its answer was rejected.
            messages += [
                {"role": "assistant", "content": reply},
                {"role": "user", "content": f"Réponse refusée ({exc}). Renvoie uniquement l'objet JSON demandé."},
            ]
            return _parse_json(_content(self.llm.chat(messages, temperature=0.1, timeout=180, thinking=False)))

    def _measure(self, sql: str, catalog: str) -> tuple[str, Any, str | None]:
        """Run a KPI on Zetaris. A KPI must return one row with one numeric column; on a SQL
        error or another result shape, the model gets one chance to fix the query."""
        error = ""
        for attempt in range(2):
            try:
                rows = self.zetaris.run_sql(sql, limit=5)
            except (ZetarisError, ValueError) as exc:
                if isinstance(exc, ZetarisError) and exc.category in _FATAL:
                    raise
                error = getattr(exc, "detail", "") or str(exc)
            else:
                values = list(rows[0].values()) if rows else []
                if len(rows) == 1 and len(values) == 1 and isinstance(values[0], (int, float)) and not isinstance(values[0], bool):
                    return sql, values[0], None
                error = (
                    f"le résultat doit être une seule ligne avec une seule colonne numérique `value` ; "
                    f"reçu {len(rows)} ligne(s) × {len(values)} colonne(s) : {rows[:2]}"
                )
            if attempt == 0:
                fixed = self.llm.chat(
                    [{"role": "user", "content": FIX_SQL_PROMPT.format(sql=sql, error=error, catalog=catalog)}],
                    temperature=0.0,
                    timeout=120,
                    thinking=False,
                )
                sql = _strip_sql(_content(fixed))
        return sql, None, error

    def plan(self, prompt: str) -> dict[str, Any]:
        catalog = describe_database(self.zetaris, self.database)
        draft = self._design(prompt, catalog)

        stages = [
            {
                "id": f"stage-{i}",
                "number": f"{i:02d}",
                "title": str(s.get("title") or f"Étape {i}"),
                "category": str(s.get("category") or "Transformation"),
                "description": str(s.get("description") or ""),
                "tables": [str(t) for t in s.get("tables") or []],
                "technologies": [str(t) for t in s.get("technologies") or []],
            }
            for i, s in enumerate(draft.get("stages") or [], start=1)
        ]
        if not stages:
            raise ValueError("Le modèle n'a proposé aucune étape de pipeline.")

        phases = [
            {
                "id": f"phase-{i}",
                "stepIndex": i,
                "title": str(p.get("title") or f"Analyse {i}"),
                "reasoning": str(p.get("reasoning") or ""),
                "scripts": [str(p["sql"])] if p.get("sql") else [],
            }
            for i, p in enumerate(draft.get("reasoning") or [], start=1)
        ]

        proposed = [k for k in draft.get("kpis") or [] if k.get("sql") and k.get("name")]
        with ThreadPoolExecutor(max_workers=4) as pool:
            measured = list(pool.map(lambda k: self._measure(_strip_sql(str(k["sql"])), catalog), proposed))

        kpis, verified_ids = [], []
        for i, (kpi, (sql, value, error)) in enumerate(zip(proposed, measured), start=1):
            kpi_id = re.sub(r"[^a-z0-9_]+", "_", str(kpi.get("id") or f"kpi_{i}").lower()).strip("_") or f"kpi_{i}"
            if error is None:
                verified_ids.append(kpi_id)
            kpis.append({
                "id": kpi_id,
                "name": str(kpi["name"]),
                "category": kpi.get("category") if kpi.get("category") in _KPI_CATEGORIES else "Custom",
                "formula": sql,
                "sourceSystem": f"Zetaris · {self.database}",
                "targetMart": str(kpi.get("target_mart") or "mart_kpis"),
                "sourceLedgerValue": _format(value) if error is None else "Non vérifié",
                "martOutputValue": "À construire",
                "variance": "—",
                "tolerance": "±0,5 %",
                "description": str(kpi.get("description") or ""),
                "dataRationale": (
                    "Valeur mesurée en direct sur Zetaris." if error is None
                    else f"Requête refusée par Zetaris : {error}"
                ),
                "businessImpact": str(kpi.get("business_impact") or ""),
            })

        questions = []
        for q in draft.get("questions") or []:
            options = [str(o) for o in q.get("options") or [] if str(o).strip()][:4]
            if q.get("question") and len(options) >= 2:
                questions.append({
                    "question": str(q["question"]),
                    "context": str(q.get("context") or ""),
                    "options": options,
                    "recommended": str(q.get("recommended") or options[0]),
                })

        return {
            "planId": f"plan_{uuid.uuid4().hex[:12]}",
            "title": str(draft.get("title") or "Pipeline proposé"),
            "prompt": prompt,
            "summary": str(draft.get("summary") or ""),
            "stages": stages,
            "reasoningPhases": phases,
            "kpis": kpis,
            "verifiedKpiIds": verified_ids,
            "questions": questions,
            "compiledSql": str(draft.get("compiled_sql") or ""),
        }


def plan_markdown(plan: dict[str, Any]) -> str:
    lines = [f"# {plan['title']}", "", plan["summary"], "", "## Étapes"]
    lines += [f"{s['number']}. **{s['title']}** ({s['category']}) — {s['description']}" for s in plan["stages"]]
    lines += ["", "## KPI (mesurés sur Zetaris)"]
    lines += [f"- **{k['name']}** : {k['sourceLedgerValue']}  \n  `{k['formula']}`" for k in plan["kpis"]]
    if plan["compiledSql"]:
        lines += ["", "## DDL du mart", "```sql", plan["compiledSql"], "```"]
    return "\n".join(lines)
