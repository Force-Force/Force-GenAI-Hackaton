#!/bin/bash
# Read-only role used by Zetaris to read the bank data. Runs last, once, on first start.
set -euo pipefail

: "${BANK_READER_USER:?BANK_READER_USER must be set}"
: "${BANK_READER_PASSWORD:?BANK_READER_PASSWORD must be set}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
     -v reader="$BANK_READER_USER" -v reader_pw="$BANK_READER_PASSWORD" <<'SQL'
CREATE ROLE :"reader" LOGIN PASSWORD :'reader_pw';
GRANT CONNECT ON DATABASE :"DBNAME" TO :"reader";
GRANT USAGE ON SCHEMA bank, ora_demo TO :"reader";
GRANT SELECT ON ALL TABLES IN SCHEMA bank, ora_demo TO :"reader";
ALTER ROLE :"reader" SET default_transaction_read_only = on;
SQL

echo "[aurabi-db] read-only role '$BANK_READER_USER' ready"
