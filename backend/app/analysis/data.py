import logging
import re
import uuid
from time import perf_counter
from typing import Any

import requests

logger = logging.getLogger(__name__)


class ZetarisError(RuntimeError):
    def __init__(self, message: str, *, category: str, request_id: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.category = category
        self.request_id = request_id
        self.status_code = status_code


class ZetarisClient:
    READ_ONLY_PREFIX = re.compile(r"^\s*(SELECT|SHOW|DESCRIBE)\b", re.IGNORECASE)
    WRITE_PREFIX = re.compile(
        r"^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|MERGE|REPLACE|GRANT|REVOKE|CALL|EXEC|BEGIN|COMMIT|ROLLBACK)\b",
        re.IGNORECASE,
    )

    def __init__(
        self,
        base_url: str,
        api_key: str,
        org_id: int = 1,
        sql_endpoint: str = "/sql-editor/sqls/run",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.org_id = org_id
        self.sql_endpoint = "/" + sql_endpoint.strip("/")

    @staticmethod
    def _normalize_sql(sql: str) -> str:
        return (sql or "").strip()

    @staticmethod
    def _outside_string_semicolons(sql: str) -> list[int]:
        positions: list[int] = []
        quote: str | None = None
        line_comment = False
        block_comment = False
        index = 0
        while index < len(sql):
            char = sql[index]
            next_char = sql[index + 1] if index + 1 < len(sql) else ""
            if line_comment:
                if char in "\r\n":
                    line_comment = False
                index += 1
                continue
            if block_comment:
                if char == "*" and next_char == "/":
                    block_comment = False
                    index += 2
                    continue
                index += 1
                continue
            if quote:
                if char == quote:
                    if next_char == quote:
                        index += 2
                        continue
                    quote = None
                index += 1
                continue
            if char == "-" and next_char == "-":
                line_comment = True
                index += 2
                continue
            if char == "/" and next_char == "*":
                block_comment = True
                index += 2
                continue
            if char in {"'", '"', "`"}:
                quote = char
            elif char == ";":
                positions.append(index)
            index += 1
        if quote or block_comment:
            raise ValueError("SQL invalide : chaîne ou commentaire non terminé.")
        return positions

    @classmethod
    def _statement_body(cls, sql: str) -> str:
        cleaned = cls._normalize_sql(sql)
        semicolons = cls._outside_string_semicolons(cleaned)
        if len(semicolons) > 1 or (semicolons and cleaned[semicolons[0] + 1 :].strip()):
            raise ValueError("SQL invalide : une seule instruction est autorisée.")
        return cleaned[: semicolons[0] if semicolons else len(cleaned)].strip()

    @classmethod
    def classify_sql(cls, sql: str) -> str:
        cleaned = cls._statement_body(sql)
        if not cleaned:
            return "empty"
        if cls.READ_ONLY_PREFIX.match(cleaned):
            return "read"
        if cls.WRITE_PREFIX.match(cleaned):
            return "write"
        return "unknown"

    def dry_run_sql(self, sql: str, limit: int = 100) -> dict[str, Any]:
        cleaned_sql = self._statement_body(sql)
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
        cleaned = self._statement_body(sql)
        if not cleaned:
            raise ValueError("SQL vide : aucune requête à exécuter.")
        if self.classify_sql(cleaned) == "read":
            return cleaned
        raise ValueError("READ_ONLY: seules les requêtes SELECT, SHOW et DESCRIBE sont autorisées.")

    def run_sql(
        self,
        sql: str,
        limit: int = 100,
        confirmed: bool = False,
        request_id: str | None = None,
    ) -> list[dict[str, Any]]:
        cleaned_sql = self.validate_sql(sql, confirmed=confirmed)
        dry_run = self.dry_run_sql(cleaned_sql, limit=limit)
        if dry_run["requires_confirmation"] and not confirmed:
            raise ValueError("Dry-run requis avant toute modification ou création.")

        request_id = request_id or str(uuid.uuid4())
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
            response = requests.post(
                f"{self.base_url}{self.sql_endpoint}",
                headers=headers,
                json=payload,
                timeout=90,
            )
            response.raise_for_status()
            body = response.json()
        except requests.Timeout as exc:
            raise ZetarisError("Zetaris a dépassé le délai d’exécution.", category="timeout", request_id=request_id) from exc
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else None
            category = {401: "authentication", 403: "authorization", 429: "rate_limit"}.get(status, "provider")
            raise ZetarisError(
                f"Zetaris a refusé la requête ({category}).",
                category=category,
                request_id=request_id,
                status_code=status,
            ) from exc
        except requests.RequestException as exc:
            logger.warning("Zetaris SQL execution failed: request_id=%s", request_id)
            raise ZetarisError("Zetaris est momentanément indisponible.", category="transport", request_id=request_id) from exc
        except ValueError as exc:
            raise ZetarisError(
                "Zetaris a renvoyé une réponse JSON invalide.",
                category="malformed_response",
                request_id=request_id,
            ) from exc

        if not isinstance(body, dict) or not isinstance(body.get("data", []), list):
            raise ZetarisError(
                "Zetaris a renvoyé une réponse inattendue.",
                category="malformed_response",
                request_id=request_id,
            )
        rows = body["data"]
        logger.info(
            "Executed Zetaris SQL: request_id=%s rows=%s duration_ms=%s",
            request_id,
            len(rows),
            round((perf_counter() - started) * 1000, 2),
        )
        return rows
