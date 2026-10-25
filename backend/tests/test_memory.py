from pathlib import Path

from app.meterless.memory import HMemMemoryStore


def test_hmem_remembers_and_retrieves_auditable_records(tmp_path: Path) -> None:
    store = HMemMemoryStore(str(tmp_path / "memory.jsonl"))
    remembered = store.remember(
        "Zetaris returned customer revenue rows",
        source="test",
        agent_id="nvidia",
        run_id="run-1",
    )

    assert remembered is not None
    matches = store.retrieve("customer revenue", run_id="run-1")
    assert matches[0].id == remembered.id
    assert matches[0].source == "test"


def test_hmem_deduplicates_same_fact(tmp_path: Path) -> None:
    store = HMemMemoryStore(str(tmp_path / "memory.jsonl"))
    kwargs = {"source": "test", "agent_id": "nvidia", "run_id": "run-1"}
    store.remember("same fact", **kwargs)
    store.remember("same fact", **kwargs)

    assert len((tmp_path / "memory.jsonl").read_text().splitlines()) == 1
