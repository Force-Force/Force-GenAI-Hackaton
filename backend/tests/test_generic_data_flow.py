import json
from pathlib import Path
from types import SimpleNamespace

from app.analysis.agent import AnalysisAgent
from app.analysis.data import ZetarisClient
from app.meterless.memory import HMemMemoryStore


class FakeZetarisClient:
    def __init__(self) -> None:
        self.queries: list[str] = []

    def run_sql(self, sql: str, limit: int = 100, confirmed: bool = False, request_id: str | None = None):
        self.queries.append(sql)
        return [
            {"region": "North", "revenue": 1200},
            {"region": "South", "revenue": 800},
        ]


class FakeModel:
    provider = "nvidia"
    last_call_metadata = {
        "provider": "nvidia",
        "model": "generic-test-model",
        "latency_ms": 0.1,
        "tokens_in": 10,
        "tokens_out": 12,
        "tool_call": True,
    }

    def __init__(self) -> None:
        self.calls = 0

    def chat_with_tools(self, messages, tools):
        self.calls += 1
        if self.calls == 1:
            tool_call = SimpleNamespace(
                id="tool-1",
                function=SimpleNamespace(
                    name="run_sql",
                    arguments=json.dumps(
                        {"sql": "SELECT region, revenue FROM sales", "limit": 10}
                    ),
                ),
            )
            return SimpleNamespace(
                choices=[
                    SimpleNamespace(
                        message=SimpleNamespace(content=None, tool_calls=[tool_call])
                    )
                ]
            )
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(
                        content="North generated 1200 and South generated 800.",
                        tool_calls=[],
                    )
                )
            ]
        )


def test_generic_zetaris_data_flows_through_agent_and_hmem(tmp_path: Path) -> None:
    zetaris = FakeZetarisClient()
    memory = HMemMemoryStore(str(tmp_path / "meterless_memory.jsonl"))
    result = AnalysisAgent(
        zetaris,
        FakeModel(),
        memory_store=memory,
        max_iterations=3,
    ).run("Show revenue by region", request_id="generic-run")

    assert result["response"].startswith("North")
    assert zetaris.queries == ["SELECT region, revenue FROM sales"]
    assert result["trace"]["sql_executions"][0]["row_count"] == 2
    assert result["trace"]["memory"]["written"]
    assert len((tmp_path / "meterless_memory.jsonl").read_text().splitlines()) == 2

    second = AnalysisAgent(
        zetaris,
        FakeModel(),
        memory_store=memory,
        max_iterations=1,
    ).run("Show revenue by region", request_id="second-run")
    assert second["trace"]["memory"]["retrieved"]


def test_generic_action_is_stopped_before_zetaris() -> None:
    zetaris = FakeZetarisClient()
    result = AnalysisAgent(zetaris, FakeModel()).run("Drop the sales table", request_id="blocked-run")

    assert result["trace"]["intent"]["approval_required"] is True
    assert result["trace"]["sql_executions"] == []
    assert zetaris.queries == []


def test_zetaris_client_accepts_generic_read_only_sql() -> None:
    client = ZetarisClient("http://example.test", "test-key")
    assert client.validate_sql("SELECT region, revenue FROM sales") == "SELECT region, revenue FROM sales"
