import logging
import re
import uuid
from time import perf_counter
from typing import Any

import requests

logger = logging.getLogger(__name__)


class ZetarisClient:
    READ_ONLY_PREFIX = re.compile(r"^\s*(SELECT|SHOW|DESCRIBE)\b", re.IGNORECASE)
    WRITE_PREFIX = re.compile(
        r"^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|MERGE|REPLACE|GRANT|REVOKE|CALL|EXEC|BEGIN|COMMIT|ROLLBACK)\b",
        re.IGNORECASE,
    )

    def __init__(self, base_url: str, api_key: str, org_id: int = 1) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.org_id = org_id

    @staticmethod
    def _normalize_sql(sql: str) -> str:
        return (sql or "").strip()

    @classmethod
    def classify_sql(cls, sql: str) -> str:
        cleaned = cls._normalize_sql(sql)
        if not cleaned:
            return "empty"
        if cls.READ_ONLY_PREFIX.match(cleaned):
            return "read"
        if cls.WRITE_PREFIX.match(cleaned):
            return "write"
        return "unknown"

    def dry_run_sql(self, sql: str, limit: int = 100) -> dict[str, Any]:
        cleaned_sql = self._normalize_sql(sql)
        if not cleaned_sql:
            raise ValueError("SQL vide : aucune requête à exécuter.")

        kind = self.classify_sql(cleaned_sql)
        plan = {
            "sql": cleaned_sql,
            "operation": kind,
            "limit": max(1, int(limit)),
            "requires_confirmation": kind in {"write", "unknown"},
            "dry_run": True,
            "message": "Aucune exécution n’a été déclenchée. Validation de plan uniquement.",
        }

        if kind == "read":
            plan["message"] = "Requête de lecture autorisée. Exécution possible sans confirmation supplémentaire."
        elif kind in {"write", "unknown"}:
            plan["message"] = (
                "Opération non-lecture détectée. Un dry-run a été produit ; "
                "l’exécution réelle nécessite une confirmation explicite et un contrôle manuel."
            )
        return plan

    def validate_sql(self, sql: str, confirmed: bool = False) -> str:
        cleaned = self._normalize_sql(sql)
        if not cleaned:
            raise ValueError("SQL vide : aucune requête à exécuter.")

        kind = self.classify_sql(cleaned)
        if confirmed:
            return cleaned

        if kind == "read":
            return cleaned

        raise ValueError(
            "READ_ONLY: seules les requêtes SELECT, SHOW et DESCRIBE sont autorisées sans confirmed=True. "
            "Tout ordre de création/modification doit passer par un dry-run et une confirmation explicite."
        )

    def run_sql(self, sql: str, limit: int = 100, confirmed: bool = False) -> list[dict[str, Any]]:
        cleaned_sql = self.validate_sql(sql, confirmed=confirmed)
        dry_run = self.dry_run_sql(cleaned_sql, limit=limit)
        if dry_run["requires_confirmation"] and not confirmed:
            raise ValueError(
                "Dry-run requis avant toute modification ou création. "
                "Passe confirmed=True uniquement après validation explicite de la requête."
            )

        url = f"{self.base_url}/sql-editor/sqls/run"
        request_id = str(uuid.uuid4())
        payload = {
            "queryId": str(uuid.uuid4()),
            "sql": cleaned_sql,
            "source": "SqlEditor",
            "limit": max(1, int(limit)),
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "X-Org-ID": str(self.org_id),
            "X-Request-ID": request_id,
            "Content-Type": "application/json",
        }

        started = perf_counter()
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=90)
            response.raise_for_status()
            body = response.json()
        except requests.RequestException as exc:
            logger.exception("Zetaris SQL execution failed")
            raise RuntimeError(f"Zetaris SQL failed: {exc}") from exc

        rows = body.get("data") or []
        duration_ms = round((perf_counter() - started) * 1000, 2)
        logger.info(
            "Executed Zetaris SQL: rows=%s duration_ms=%s query=%s",
            len(rows),
            duration_ms,
            cleaned_sql[:200],
        )
        return rows
