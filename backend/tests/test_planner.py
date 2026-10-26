import json
from types import SimpleNamespace

from app.analysis import planner as planner_module
from app.analysis.data import ZetarisError
from app.analysis.planner import PlannerAgent, _parse_json, plan_markdown

DRAFT = {
    "title": "Détection de fraude",
    "summary": "Pipeline de scoring.",
    "stages": [{"title": "Ingestion", "category": "Ingestion", "description": "Lire", "tables": ["BANK.transactions"]}],
    "reasoning": [{"title": "Sources", "reasoning": "Les transactions portent les montants.", "sql": "SELECT 1"}],
    "kpis": [
        {"id": "Fraud Loss", "name": "Pertes fraude", "category": "Finance", "sql": "SELECT SUM(x) AS value FROM BANK.f"},
        {"id": "broken", "name": "KPI cassé", "category": "Weird", "sql": "SELECT nope AS value FROM BANK.t"},
    ],
    "questions": [{"question": "Granularité ?", "options": ["Jour", "Mois"], "recommended": "Mois"},
                  {"question": "Sans options", "options": ["Seule"]}],
    "compiled_sql": "CREATE VIEW mart AS SELECT 1",
}


def completion(text: str):
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=text))])


class FakeLlm:
    def __init__(self, replies):
        self.replies = list(replies)
        self.prompts = []

    def chat(self, messages, temperature=0.2, timeout=90.0, thinking=True):
        self.prompts.append(messages[-1]["content"])
        return completion(self.replies.pop(0))


class FakeZetaris:
    base_url = "http://zetaris"

    def __init__(self):
        self.sql = []

    def run_sql(self, sql, limit=100, confirmed=False, request_id=None):
        self.sql.append(sql)
        if "nope" in sql:
            error = ZetarisError("refused", category="provider", request_id="r")
            error.detail = "cannot resolve 'nope'"
            raise error
        return [{"value": 3281791.5}]


def test_parse_json_ignores_reasoning_tags_and_code_fences() -> None:
    text = '<think>je réfléchis</think>\n```json\n{"title": "ok"}\n```'
    assert _parse_json(text) == {"title": "ok"}


def test_plan_measures_kpis_and_keeps_unverified_ones_visible(monkeypatch) -> None:
    monkeypatch.setattr(planner_module, "describe_database", lambda client, db: "- BANK.transactions(x double)")
    # draft, then one SQL repair that still fails
    llm = FakeLlm([json.dumps(DRAFT), "SELECT nope AS value FROM BANK.t"])
    zetaris = FakeZetaris()

    plan = PlannerAgent(zetaris, llm, "BANK").plan("Construis un pipeline de fraude")

    assert [s["number"] for s in plan["stages"]] == ["01"]
    assert plan["reasoningPhases"][0]["scripts"] == ["SELECT 1"]
    good, broken = plan["kpis"]
    assert good["id"] == "fraud_loss" and good["sourceLedgerValue"] == "3 281 791.50"
    assert broken["category"] == "Custom" and broken["sourceLedgerValue"] == "Non vérifié"
    assert "cannot resolve 'nope'" in broken["dataRationale"]
    assert plan["verifiedKpiIds"] == ["fraud_loss"]
    assert [q["question"] for q in plan["questions"]] == ["Granularité ?"]
    assert "Pertes fraude" in plan_markdown(plan)
    assert any("cannot resolve 'nope'" in p for p in llm.prompts)


def test_kpi_returning_several_rows_is_sent_back_for_repair(monkeypatch) -> None:
    class RowsZetaris(FakeZetaris):
        def run_sql(self, sql, limit=100, confirmed=False, request_id=None):
            self.sql.append(sql)
            if "GROUP BY" in sql:
                return [{"branch_code": "FR-BOR-01", "value": 10.0}, {"branch_code": "CM-DLA-01", "value": 5.0}]
            return [{"value": 15}]

    llm = FakeLlm(["SELECT SUM(x) AS value FROM BANK.t"])
    agent = PlannerAgent(RowsZetaris(), llm, "BANK")

    sql, value, error = agent._measure("SELECT branch_code, SUM(x) AS value FROM BANK.t GROUP BY branch_code", "catalog")

    assert (sql, value, error) == ("SELECT SUM(x) AS value FROM BANK.t", 15, None)
    assert "2 ligne(s)" in llm.prompts[0]


def test_plan_language_follows_the_request() -> None:
    from app.analysis.planner import _is_french

    assert _is_french("Construis un pipeline de suivi du risque de crédit par agence")
    assert not _is_french("Build a card fraud detection pipeline with monthly loss tracking")
