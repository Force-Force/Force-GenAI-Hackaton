"""Live schema discovery: what Zetaris exposes, read from Zetaris itself."""

import threading
import time
from concurrent.futures import ThreadPoolExecutor

from app.analysis.data import ZetarisClient

_CACHE_TTL_S = 1800
_cache: dict[str, tuple[float, str]] = {}
_lock = threading.Lock()


def _describe(client: ZetarisClient, identifier: str) -> str:
    columns = client.run_sql(f"DESCRIBE {identifier}", limit=500)
    names = [
        f"{col.get('col_name')} {col.get('data_type', '')}".strip()
        for col in columns
        if col.get("col_name") and not str(col.get("col_name")).startswith("#")
    ]
    return f"- {identifier}({', '.join(names)})"


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
