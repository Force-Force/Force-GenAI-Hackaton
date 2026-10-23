import logging
import re
import uuid
from time import perf_counter
from typing import Any

import requests

logger = logging.getLogger(__name__)


class ZetarisClient:
    READ_ONLY_PREFIX = re.compile(r"^\s*(SELECT|SHOW|DESCRIBE)\b", re.IGNORECASE)

    def __init__(self, base_url: str, api_key: str, org_id: int = 1) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.org_id = org_id

    def validate_sql(self, sql: str, confirmed: bool = False) -> str:
        cleaned = (sql or "").strip()
        if not cleaned:
            raise ValueError("SQL vide : aucune requête à exécuter.")
        if confirmed:
            return cleaned
        if not self.READ_ONLY_PREFIX.match(cleaned):
            raise ValueError(
                "READ_ONLY: seules les requêtes SELECT, SHOW et DESCRIBE sont autorisées sans confirmed=True."
            )
        return cleaned

    def run_sql(self, sql: str, limit: int = 100, confirmed: bool = False) -> list[dict[str, Any]]:
        cleaned_sql = self.validate_sql(sql, confirmed=confirmed)
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
