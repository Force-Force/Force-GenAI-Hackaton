import base64
import json
import logging
import re
import threading
import time
import uuid
from time import perf_counter
from typing import Any

import requests

logger = logging.getLogger(__name__)

# Zetaris login tokens are short-lived JWTs (15 minutes on the platform), shared by every
# client instance of the process: (auth_url, username) -> (token, org_id, expires_at).
_TOKEN_LOCK = threading.Lock()
_TOKEN_CACHE: dict[tuple[str, str], tuple[str, int, float]] = {}
_TOKEN_REFRESH_MARGIN_S = 60

# Zetaris returns every value as a string. Plain decimal numbers are typed back so the
# model and the charts see numbers; long digit strings (identifiers) stay strings.
_NUMBER = re.compile(r"^-?(0|[1-9]\d{0,11})(\.\d+)?$")


def _coerce(value: Any) -> Any:
    if isinstance(value, str) and _NUMBER.match(value):
        return float(value) if "." in value else int(value)
    return value


def _jwt_expiry(token: str) -> float | None:
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return float(json.loads(base64.urlsafe_b64decode(payload))["exp"])
    except (IndexError, KeyError, TypeError, ValueError):
        return None


class ZetarisError(RuntimeError):
    def __init__(self, message: str, *, category: str, request_id: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.category = category
        self.request_id = request_id
        self.status_code = status_code
        # Engine message safe to show the model (SQL error text), empty when unknown.
        self.detail = ""


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
        *,
        auth_url: str = "",
        username: str = "",
        password: str = "",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.org_id = org_id
        self.sql_endpoint = "/" + sql_endpoint.strip("/")
        self.auth_url = auth_url
        self.username = username
        self.password = password

    @classmethod
    def from_settings(cls, settings: Any) -> "ZetarisClient":
        return cls(
            settings.resolved_zetaris_url,
            settings.zetaris_api_key,
            settings.zetaris_org_id,
            settings.zetaris_sql_endpoint,
            auth_url=settings.zetaris_auth_url,
            username=settings.zetaris_username,
            password=settings.zetaris_password,
        )

    @property
    def uses_login(self) -> bool:
        """A static API key wins; otherwise the client signs in with the configured account."""
        return not self.api_key and bool(self.auth_url and self.username and self.password)

    def _login(self) -> tuple[str, int, float]:
        try:
            response = requests.post(
                self.auth_url,
                json={"username": self.username, "password": self.password},
                timeout=30,
            )
            response.raise_for_status()
            body = response.json()
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else None
            raise ZetarisError(
                "Connexion Zetaris refusée : vérifiez ZETARIS_USERNAME / ZETARIS_PASSWORD.",
                category="authentication",
                request_id="login",
                status_code=status,
            ) from exc
        except (requests.RequestException, ValueError) as exc:
            raise ZetarisError(
                "Service de connexion Zetaris injoignable.", category="transport", request_id="login"
            ) from exc
        token = body.get("idToken") or body.get("accessToken") or body.get("token")
        if not token:
            raise ZetarisError("La connexion Zetaris n’a renvoyé aucun jeton.", category="authentication", request_id="login")
        org_id = int(body.get("orgId") or self.org_id)
        expires_at = _jwt_expiry(token) or time.time() + 600
        return token, org_id, expires_at

    def _credentials(self, force_refresh: bool = False) -> tuple[str, int]:
        if not self.uses_login:
            return self.api_key, self.org_id
        key = (self.auth_url, self.username)
        with _TOKEN_LOCK:
            cached = _TOKEN_CACHE.get(key)
            if cached and not force_refresh and cached[2] - _TOKEN_REFRESH_MARGIN_S > time.time():
                return cached[0], cached[1]
            token, org_id, expires_at = self._login()
            _TOKEN_CACHE[key] = (token, org_id, expires_at)
            return token, org_id

    def _post(self, payload: dict[str, Any], token: str, org_id: int, request_id: str) -> requests.Response:
        return requests.post(
            f"{self.base_url}{self.sql_endpoint}",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Org-ID": str(org_id),
                "X-Request-ID": request_id,
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=90,
        )

    @staticmethod
    def _error_detail(response: requests.Response | None) -> str:
        """First line of the engine's message (e.g. a SQL parse error), without the Java stack."""
        if response is None:
            return ""
        try:
            message = str(response.json().get("msg") or "")
        except ValueError:
            message = response.text or ""
        message = re.sub(r"^.*?(LightningDdlParseException|AnalysisException|ParseException):\s*", "", message, flags=re.S)
        message = message.split("\tat ")[0].split("== SQL ==")[0]
        return " ".join(message.split())[:400]

    @staticmethod
    def _records(body: dict[str, Any]) -> list[dict[str, Any]]:
        """Zetaris answers {"headers": [...], "data": [[...], ...]}: return one dict per row."""
        rows = body.get("data", [])
        headers = body.get("headers")
        if isinstance(headers, list) and all(isinstance(row, list) for row in rows):
            return [{str(name): _coerce(value) for name, value in zip(headers, row)} for row in rows]
        return rows

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
        started = perf_counter()
        try:
            token, org_id = self._credentials()
            response = self._post(payload, token, org_id, request_id)
            if response.status_code == 401 and self.uses_login:
                # Token revoked or expired early: sign in again once.
                token, org_id = self._credentials(force_refresh=True)
                response = self._post(payload, token, org_id, request_id)
            response.raise_for_status()
            body = response.json()
        except requests.Timeout as exc:
            raise ZetarisError("Zetaris a dépassé le délai d’exécution.", category="timeout", request_id=request_id) from exc
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else None
            category = {401: "authentication", 403: "authorization", 429: "rate_limit"}.get(status, "provider")
            error = ZetarisError(
                f"Zetaris a refusé la requête ({category}).",
                category=category,
                request_id=request_id,
                status_code=status,
            )
            error.detail = self._error_detail(exc.response)
            raise error from exc
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
        rows = self._records(body)
        logger.info(
            "Executed Zetaris SQL: request_id=%s rows=%s duration_ms=%s",
            request_id,
            len(rows),
            round((perf_counter() - started) * 1000, 2),
        )
        return rows
