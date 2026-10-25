from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any


@dataclass(frozen=True)
class MemoryRecord:
    id: str
    content: str
    memory_type: str
    layer: str
    source: str
    confidence: float
    domain: str
    namespace: str
    agent_id: str
    run_id: str
    task_id: str | None
    created_at: str
    access_count: int = 0

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


class HMemMemoryStore:
    """Small local-first H-MEM store with durable JSONL audit records."""

    def __init__(self, path: str = "logs/meterless_memory.jsonl") -> None:
        self.path = Path(path)
        self._lock = Lock()

    def retrieve(self, query: str, *, limit: int = 5, run_id: str | None = None) -> list[MemoryRecord]:
        records = self._read_records()
        query_terms = self._terms(query)
        scored: list[tuple[float, MemoryRecord]] = []
        for record in records:
            terms = self._terms(record.content)
            overlap = len(query_terms & terms)
            scope_boost = 1.5 if run_id and record.run_id == run_id else 0.0
            layer_boost = {"long_term": 1.0, "working": 0.5, "short_term": 0.0}.get(record.layer, 0.0)
            score = overlap + scope_boost + layer_boost + record.confidence
            if score > 0:
                scored.append((score, record))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [record for _, record in scored[: max(1, limit)]]

    def remember(
        self,
        content: str,
        *,
        source: str,
        agent_id: str,
        run_id: str,
        task_id: str | None = None,
        memory_type: str = "factual",
        layer: str = "working",
        confidence: float = 0.7,
        domain: str = "aurabi",
        namespace: str = "analysis",
    ) -> MemoryRecord | None:
        normalized = self._normalize(content)
        if not normalized:
            return None
        record = MemoryRecord(
            id="mem_" + hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:20],
            content=normalized,
            memory_type=memory_type,
            layer=layer,
            source=source,
            confidence=max(0.0, min(1.0, confidence)),
            domain=domain,
            namespace=namespace,
            agent_id=agent_id,
            run_id=run_id,
            task_id=task_id,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        with self._lock:
            existing = {item.id for item in self._read_records()}
            if record.id not in existing:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                with self.path.open("a", encoding="utf-8") as handle:
                    handle.write(json.dumps({"event": "memory.remembered", **record.as_dict()}) + "\n")
        return record

    def _read_records(self) -> list[MemoryRecord]:
        if not self.path.exists():
            return []
        records: list[MemoryRecord] = []
        for line in self.path.read_text(encoding="utf-8").splitlines():
            try:
                payload = json.loads(line)
                if payload.get("event") != "memory.remembered":
                    continue
                payload.pop("event", None)
                records.append(MemoryRecord(**payload))
            except (json.JSONDecodeError, TypeError):
                continue
        return records

    @staticmethod
    def _normalize(content: str) -> str:
        return re.sub(r"\s+", " ", content).strip()[:1200]

    @staticmethod
    def _terms(content: str) -> set[str]:
        return {term for term in re.findall(r"[a-zA-ZÀ-ÿ0-9_]{3,}", content.lower())}
