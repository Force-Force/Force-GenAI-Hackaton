"""Register the AuraBI bank database in Zetaris as a JDBC datasource.

Run once at startup (docker compose service `zetaris-setup`):

    python -m app.cli.register_zetaris

The datasource is dropped and re-created on every run so it always carries the current
read-only credentials, then its tables are imported and a verification query is executed
through Zetaris. Exits non-zero, with the reason, when any step fails.
"""

import os
import sys
import time
import uuid

import requests

from app.analysis.config import AnalysisSettings
from app.analysis.data import ZetarisClient, ZetarisError

WAIT_FOR_ZETARIS_S = int(os.environ.get("ZETARIS_WAIT_SECONDS", "300"))


def log(message: str) -> None:
    print(f"[zetaris-setup] {message}", flush=True)


def require_env(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        sys.exit(f"[zetaris-setup] ERROR: {name} is not set in .env")
    return value


def execute(client: ZetarisClient, sql: str) -> list[list]:
    """Run an administrative statement (DDL included) through the Zetaris SQL endpoint."""
    token, org_id = client._credentials()
    response = client._post(
        {"queryId": str(uuid.uuid4()), "sql": sql, "source": "SqlEditor", "limit": 500},
        token,
        org_id,
        str(uuid.uuid4()),
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Zetaris rejected `{sql.split(' OPTIONS')[0]}`: {client._error_detail(response)}")
    return response.json().get("data", [])


def wait_for_login(client: ZetarisClient) -> None:
    deadline = time.time() + WAIT_FOR_ZETARIS_S
    while True:
        try:
            client._credentials(force_refresh=True)
            return
        except ZetarisError as exc:
            if exc.category == "authentication" or time.time() > deadline:
                sys.exit(
                    f"[zetaris-setup] ERROR: cannot sign in to Zetaris at {client.auth_url or client.base_url}: {exc}\n"
                    "  Is the Zetaris platform running (cd zetaris-platform && ./verify.sh)?\n"
                    "  Are ZETARIS_USERNAME / ZETARIS_PASSWORD in .env correct?"
                )
            log("waiting for Zetaris to accept sign-in…")
            time.sleep(10)


def main() -> None:
    settings = AnalysisSettings()
    database = settings.zetaris_bank_database
    reader = require_env("BANK_READER_USER")
    reader_password = require_env("BANK_READER_PASSWORD")
    db_host = os.environ.get("BANK_DB_HOST_FOR_ZETARIS", "aurabi-db")
    db_name = os.environ.get("POSTGRES_DB", "datapipe")
    if '"' in reader_password:
        sys.exit('[zetaris-setup] ERROR: BANK_READER_PASSWORD must not contain a double quote (")')

    client = ZetarisClient.from_settings(settings)
    if not (client.api_key or client.uses_login):
        sys.exit("[zetaris-setup] ERROR: set ZETARIS_API_KEY, or ZETARIS_AUTH_URL + ZETARIS_USERNAME + ZETARIS_PASSWORD")

    log(f"Zetaris API: {client.base_url}")
    wait_for_login(client)
    log("signed in to Zetaris")

    existing = {str(row[0]).upper() for row in execute(client, "SHOW DATASOURCES")}
    if database.upper() in existing:
        execute(client, f"DROP DATASOURCE {database}")
        log(f"dropped previous datasource {database}")

    execute(
        client,
        # Zetaris descriptions accept only letters, digits, spaces and _ . - ,
        f'CREATE DATASOURCE {database} DESCRIBE BY "AuraBI demo bank, PostgreSQL schema bank" OPTIONS ('
        f'jdbcdriver "org.postgresql.Driver", '
        f'jdbcurl "jdbc:postgresql://{db_host}:5432/{db_name}", '
        f'username "{reader}", password "{reader_password}", schema "bank")',
    )
    execute(client, f"REGISTER DATASOURCE TABLES FROM {database}")
    tables = execute(client, f"SHOW TABLES IN {database}")
    log(f"registered datasource {database} with {len(tables)} tables/views")

    # End-to-end proof: Zetaris -> JDBC -> PostgreSQL, with the read-only client the agent uses.
    rows = client.run_sql(f"SELECT count(*) AS customers FROM {database}.customers", limit=1)
    count = rows[0].get("customers") if rows else None
    if not count:
        sys.exit(f"[zetaris-setup] ERROR: verification query returned {rows!r}")
    log(f"verified through Zetaris: {database}.customers has {count} rows")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ZetarisError) as exc:
        sys.exit(f"[zetaris-setup] ERROR: {exc}")
