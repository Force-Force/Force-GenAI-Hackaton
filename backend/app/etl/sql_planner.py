"""Conservative SQL planning for the legacy pipeline compatibility surface."""

from __future__ import annotations

from typing import Any


def _fallback_sql(profile: dict[str, Any], instruction: str) -> dict[str, str]:
    qname = profile.get("qualified_name") or "ora_demo.transactions"
    text = instruction.lower()
    if any(word in text for word in ("devise", "currency", "par devise")):
        return {
            "sql": (
                f"SELECT currency, COUNT(*) AS nb_transactions, "
                f"ROUND(SUM(amount)::numeric, 2) AS total_amount "
                f"FROM {qname} GROUP BY currency ORDER BY total_amount DESC"
            ),
            "explanation": "Agrégation par devise.",
        }
    if any(word in text for word in ("catégor", "category", "par categor")):
        return {
            "sql": (
                f"SELECT category, COUNT(*) AS nb, ROUND(AVG(amount)::numeric, 2) AS montant_moyen "
                f"FROM {qname} GROUP BY category ORDER BY nb DESC"
            ),
            "explanation": "Statistiques par catégorie.",
        }
    if any(word in text for word in ("top", "plus grand", "maximum", "montant")):
        return {"sql": f"SELECT * FROM {qname} ORDER BY amount DESC LIMIT 10", "explanation": "Top 10 par montant."}
    if any(word in text for word in ("france", " pays", "country")):
        return {
            "sql": (
                f"SELECT country_code, COUNT(*) AS nb, ROUND(SUM(amount)::numeric, 2) AS total "
                f"FROM {qname} GROUP BY country_code"
            ),
            "explanation": "Répartition par pays.",
        }
    return {"sql": f"SELECT * FROM {qname} LIMIT 20", "explanation": "Aperçu des données source."}


async def plan_etl_sql(profile: dict[str, Any], instruction: str) -> dict[str, str]:
    if not profile.get("connected"):
        raise ValueError(profile.get("error") or "Source non connectée")
    return _fallback_sql(profile, instruction)
