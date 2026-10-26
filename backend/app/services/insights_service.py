"""Insights page: KPI cards and charts computed by Zetaris on the bank data.

Every figure comes from a SQL query executed through Zetaris; nothing is estimated. The
result is a UIOP envelope (insight.set_summary + insight.add) that the frontend applies
as-is (see frontend/src/contracts/uiop.ts).
"""

import statistics
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any

from app.analysis.config import AnalysisSettings
from app.analysis.data import ZetarisClient

_CACHE_TTL_S = 600
_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_lock = threading.Lock()


def _eur(value: float) -> str:
    sign = "-" if value < 0 else ""
    value = abs(value)
    if value >= 1_000_000:
        return f"{sign}€{value / 1_000_000:.2f}M"
    if value >= 1_000:
        return f"{sign}€{value / 1_000:.1f}K"
    return f"{sign}€{value:,.0f}"


def _queries(db: str) -> dict[str, str]:
    return {
        "volume_by_year": (
            f"SELECT year(txn_ts) AS year, round(sum(amount_eur), 0) AS volume_eur FROM {db}.transactions "
            f"WHERE status = 'COMPLETED' AND direction = 'DEBIT' AND txn_ts < '2026-01-01' GROUP BY year(txn_ts)"
        ),
        "active_customers": (
            f"SELECT year(t.txn_ts) AS year, count(DISTINCT a.customer_id) AS customers FROM {db}.transactions t "
            f"JOIN {db}.accounts a ON t.account_id = a.account_id "
            f"WHERE t.status = 'COMPLETED' AND t.txn_ts < '2026-01-01' GROUP BY year(t.txn_ts)"
        ),
        "fraud_by_type": (
            f"SELECT fraud_type, count(*) AS cases, round(sum(loss_amount_eur), 0) AS loss_eur FROM {db}.fraud_cases "
            f"WHERE confirmed = true GROUP BY fraud_type ORDER BY loss_eur DESC"
        ),
        "loans": (
            f"SELECT count(*) AS loans, sum(CASE WHEN status = 'DEFAULT' THEN 1 ELSE 0 END) AS defaults, "
            f"sum(CASE WHEN status IN ('LATE_30', 'LATE_90') THEN 1 ELSE 0 END) AS late FROM {db}.loans"
        ),
        "monthly": (
            f"SELECT month, debit_volume_eur, credit_volume_eur, fraud_loss_eur, declined_pct "
            f"FROM {db}.v_monthly_kpis ORDER BY month"
        ),
        "categories": (
            f"SELECT category, volume_eur, transactions, avg_ticket_eur FROM {db}.v_merchant_category_spend "
            f"WHERE year = 2025 ORDER BY volume_eur DESC"
        ),
        "branches": (
            f"SELECT branch_code, city, customers, deposits_eur, loan_book_eur, default_rate_pct "
            f"FROM {db}.v_branch_performance ORDER BY deposits_eur DESC"
        ),
    }


def _run_all(client: ZetarisClient, queries: dict[str, str]) -> dict[str, list[dict[str, Any]]]:
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {name: pool.submit(client.run_sql, sql, 500) for name, sql in queries.items()}
        return {name: future.result() for name, future in futures.items()}


def _provenance(table: str, sql: str, rows: list, executed_at: str) -> dict[str, Any]:
    return {"sourceTables": [table], "executedSql": sql, "rowCount": len(rows), "executedAt": executed_at}


def _build(db: str) -> dict[str, Any]:
    settings = AnalysisSettings()
    client = ZetarisClient.from_settings(settings)
    queries = _queries(db)
    r = _run_all(client, queries)
    executed_at = datetime.now(timezone.utc).isoformat()

    volume = {int(row["year"]): float(row["volume_eur"]) for row in r["volume_by_year"]}
    customers = {int(row["year"]): int(row["customers"]) for row in r["active_customers"]}
    loans = r["loans"][0]
    fraud_loss = sum(float(row["loss_eur"]) for row in r["fraud_by_type"])
    fraud_cases = sum(int(row["cases"]) for row in r["fraud_by_type"])
    growth = (volume.get(2025, 0) / volume[2024] - 1) * 100 if volume.get(2024) else 0.0
    default_rate = 100 * int(loans["defaults"]) / int(loans["loans"]) if int(loans["loans"]) else 0.0

    cards = [
        {"id": "kpi_debits", "label": "Débits 2025", "value": _eur(volume.get(2025, 0)),
         "delta": f"{growth:+.1f}% vs 2024", "trend": "up" if growth >= 0 else "down",
         "sourceTable": f"{db}.transactions"},
        {"id": "kpi_customers", "label": "Clients actifs 2025", "value": f"{customers.get(2025, 0):,}".replace(",", " "),
         "delta": f"{customers.get(2024, 0):,} en 2024".replace(",", " "), "trend": "neutral",
         "sourceTable": f"{db}.accounts"},
        {"id": "kpi_fraud", "label": "Pertes fraude confirmées", "value": _eur(fraud_loss),
         "delta": f"{fraud_cases} cas", "trend": "down", "sourceTable": f"{db}.fraud_cases"},
        {"id": "kpi_default", "label": "Taux de défaut crédits", "value": f"{default_rate:.1f}%",
         "delta": f"{int(loans['late'])} prêts en retard", "trend": "down", "sourceTable": f"{db}.loans"},
    ]

    monthly = r["monthly"]
    line = [
        {"x": str(row["month"])[:7], "y": float(row["debit_volume_eur"] or 0), "series": "Débits",
         "formatted": _eur(float(row["debit_volume_eur"] or 0))}
        for row in monthly
    ] + [
        {"x": str(row["month"])[:7], "y": float(row["credit_volume_eur"] or 0), "series": "Crédits",
         "formatted": _eur(float(row["credit_volume_eur"] or 0))}
        for row in monthly
    ]

    categories = r["categories"]
    bars = [
        {"category": str(row["category"]), "value": float(row["volume_eur"]), "formatted": _eur(float(row["volume_eur"])),
         "secondaryValue": float(row["transactions"])}
        for row in categories
    ]

    pie = [
        {"label": str(row["fraud_type"]), "value": float(row["loss_eur"]),
         "sharePct": round(100 * float(row["loss_eur"]) / fraud_loss, 1) if fraud_loss else 0.0,
         "formatted": _eur(float(row["loss_eur"]))}
        for row in r["fraud_by_type"]
    ]

    branches = r["branches"]
    table = {
        "columns": ["Agence", "Ville", "Clients", "Dépôts", "Encours crédits", "Taux de défaut"],
        "rows": [
            {"Agence": str(row["branch_code"]), "Ville": str(row["city"]), "Clients": int(row["customers"]),
             "Dépôts": _eur(float(row["deposits_eur"])), "Encours crédits": _eur(float(row["loan_book_eur"])),
             "Taux de défaut": f"{float(row['default_rate_pct']):.2f}%"}
            for row in branches
        ],
    }

    losses = [float(row["fraud_loss_eur"] or 0) for row in monthly]
    mean = statistics.fmean(losses) if losses else 0.0
    spread = 2 * statistics.pstdev(losses) if len(losses) > 1 else 0.0
    ribbon = [
        {"date": str(row["month"])[:7], "actual": loss, "expectedUpper": round(mean + spread, 2),
         "expectedLower": round(max(0.0, mean - spread), 2), "isAnomaly": loss > mean + spread,
         **({"anomalyDelta": f"+{_eur(loss - mean)} vs moyenne"} if loss > mean + spread else {})}
        for row, loss in zip(monthly, losses)
    ]
    anomalous = [point["date"] for point in ribbon if point["isAnomaly"]]
    top_category = categories[0] if categories else None
    top_fraud = r["fraud_by_type"][0] if r["fraud_by_type"] else None

    insights = [
        {
            "id": "ins_monthly_flows", "domain": "sales", "categoryLabel": "Flux mensuels",
            "title": "Débits et crédits mensuels (EUR)",
            "summary": f"Les débits 2025 atteignent {_eur(volume.get(2025, 0))}, soit {growth:+.1f}% par rapport à 2024.",
            "aiReasoning": "Volumes complétés agrégés par mois (v_monthly_kpis), montants convertis en EUR au taux du jour.",
            "aiConfidenceScore": 100, "chart": {"type": "line", "data": line},
            "provenance": _provenance(f"{db}.v_monthly_kpis", queries["monthly"], monthly, executed_at),
            "headlineMetrics": [{"label": "Croissance des débits", "value": f"{growth:+.1f}%", "delta": "2025 vs 2024",
                                 "trend": "up" if growth >= 0 else "down"}],
        },
        {
            "id": "ins_categories", "domain": "sales", "categoryLabel": "Dépenses par catégorie",
            "title": "Dépenses carte et prélèvements par catégorie — 2025",
            "summary": (f"{top_category['category']} est la première catégorie de dépense avec "
                        f"{_eur(float(top_category['volume_eur']))}." if top_category else "Aucune dépense en 2025."),
            "aiReasoning": "Transactions complétées rattachées à un commerçant, regroupées par catégorie (v_merchant_category_spend).",
            "aiConfidenceScore": 100, "chart": {"type": "bar", "data": bars},
            "provenance": _provenance(f"{db}.v_merchant_category_spend", queries["categories"], categories, executed_at),
        },
        {
            "id": "ins_fraud_types", "domain": "anomalies", "categoryLabel": "Fraude",
            "title": "Pertes de fraude confirmées par typologie",
            "summary": (f"{top_fraud['fraud_type']} concentre {_eur(float(top_fraud['loss_eur']))} de pertes "
                        f"sur un total de {_eur(fraud_loss)} ({fraud_cases} cas confirmés)." if top_fraud else "Aucune fraude confirmée."),
            "aiReasoning": "Dossiers de fraude confirmés (fraud_cases.confirmed = true), pertes en EUR.",
            "aiConfidenceScore": 100, "chart": {"type": "pie", "data": pie},
            "provenance": _provenance(f"{db}.fraud_cases", queries["fraud_by_type"], r["fraud_by_type"], executed_at),
        },
        {
            "id": "ins_fraud_anomalies", "domain": "anomalies", "categoryLabel": "Détection d’anomalies",
            "title": "Pertes de fraude mensuelles hors norme",
            "summary": (f"Mois au-dessus de la bande attendue (moyenne + 2σ) : {', '.join(anomalous)}." if anomalous
                        else "Aucun mois ne dépasse la bande attendue (moyenne + 2σ)."),
            "aiReasoning": f"Bande attendue = moyenne mensuelle {_eur(mean)} ± 2 écarts-types sur 24 mois.",
            "aiConfidenceScore": 100, "chart": {"type": "anomaly-ribbon", "data": ribbon},
            "provenance": _provenance(f"{db}.v_monthly_kpis", queries["monthly"], monthly, executed_at),
        },
        {
            "id": "ins_branches", "domain": "customers", "categoryLabel": "Réseau d’agences",
            "title": "Performance des agences",
            "summary": f"{len(branches)} agences ; la mieux dotée en dépôts est {branches[0]['branch_code']}." if branches else "Aucune agence.",
            "aiReasoning": "Dépôts (soldes positifs) et encours de crédit convertis en EUR au 31/12/2025 (v_branch_performance).",
            "aiConfidenceScore": 100, "chart": {"type": "kpi-table", "data": table},
            "provenance": _provenance(f"{db}.v_branch_performance", queries["branches"], branches, executed_at),
        },
    ]
    return {"summaryCards": cards, "insights": insights}


def pipeline_insights(pipeline_id: str) -> dict[str, Any]:
    settings = AnalysisSettings()
    db = settings.zetaris_bank_database
    with _lock:
        cached = _cache.get(db)
    if cached and cached[0] > time.time():
        content = cached[1]
    else:
        content = _build(db)
        with _lock:
            _cache[db] = (time.time() + _CACHE_TTL_S, content)

    operations = [{"op": "insight.clear", "params": {}}, {"op": "insight.set_summary", "params": {"cards": content["summaryCards"]}}]
    operations += [{"op": "insight.add", "params": insight} for insight in content["insights"]]
    return {
        **content,
        "uiop": {
            "protocol": "uiop",
            "version": "1.0",
            "messageId": f"msg_insights_{uuid.uuid4().hex}",
            "workspaceId": pipeline_id,
            "baseRevision": 0,
            "source": {"agentId": "zetaris-insights", "executionId": f"exec_{uuid.uuid4().hex}"},
            "operations": operations,
        },
    }
