"""Live schema discovery: what Zetaris exposes, read from Zetaris itself."""

import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor

from app.analysis.data import ZetarisClient, ZetarisError

_CACHE_TTL_S = 1800
_cache: dict[str, tuple[float, str]] = {}
_lock = threading.Lock()

# Text columns whose name suggests a small set of codes: their values are listed so the
# model writes `status = 'DEFAULT'`, not a guessed `status = 'Default'`.
_CATEGORICAL = re.compile(r"(status|type|category|segment|channel|direction|currency|rating|level|role|product|network|kind|quote)$")
_MAX_VALUES = 12


def _values(client: ZetarisClient, identifier: str, column: str) -> list[str] | None:
    try:
        rows = client.run_sql(f"SELECT DISTINCT {column} AS v FROM {identifier} LIMIT {_MAX_VALUES + 1}", limit=_MAX_VALUES + 1)
    except (ZetarisError, ValueError):
        return None
    values = sorted(str(r["v"]) for r in rows if r.get("v") is not None)
    return values if len(values) <= _MAX_VALUES else None


def _describe(client: ZetarisClient, identifier: str) -> str:
    columns = [
        (str(col["col_name"]), str(col.get("data_type", "")))
        for col in client.run_sql(f"DESCRIBE {identifier}", limit=500)
        if col.get("col_name") and not str(col.get("col_name")).startswith("#")
    ]
    parts = []
    for name, data_type in columns:
        part = f"{name} {data_type}".strip()
        if data_type == "string" and _CATEGORICAL.search(name):
            values = _values(client, identifier, name)
            if values:
                part += " ∈ {" + ", ".join(values) + "}"
        parts.append(part)
    return f"- {identifier}({', '.join(parts)})"


def describe_database(client: ZetarisClient, database: str) -> str:
    """One line per table/view of a Lightning database: `- DB.table(col type, ...)`."""
    key = f"{client.base_url}|{database}"
    with _lock:
        cached = _cache.get(key)
        if cached and cached[0] > time.time():
            return cached[1]

    tables = client.run_sql(f"SHOW TABLES IN {database}", limit=500)
    identifiers = sorted(str(row["table_identifier"]) for row in tables if row.get("table_identifier"))
    with ThreadPoolExecutor(max_workers=6) as pool:
        lines = list(pool.map(lambda identifier: _describe(client, identifier), identifiers))
    catalog = "\n".join(lines)

    with _lock:
        _cache[key] = (time.time() + _CACHE_TTL_S, catalog)
    return catalog
