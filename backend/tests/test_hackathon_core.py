import pytest

from app.hackathon.data import ZetarisClient
from app.hackathon.power import NemotronClient
from app.hackathon.supervisor import SupervisorAgent


def test_supervisor_response_has_request_id_and_status() -> None:
    supervisor = SupervisorAgent(
        zetaris_client=ZetarisClient(base_url="http://localhost:8888/api/v1.0", api_key="demo-key", org_id=1),
        llm_client=NemotronClient(base_url="https://example.com/v1", api_key="demo-key", model="demo-model"),
    )

    result = supervisor.run("Quel est le KPI de croissance ?")

    assert result["status"] == "ok"
    assert result["request_id"]
    assert result["trace"]["request_id"] == result["request_id"]


def test_zetaris_rejects_write_sql_without_confirmation() -> None:
    client = ZetarisClient(
        base_url="http://localhost:8888/api/v1.0",
        api_key="demo-key",
        org_id=1,
    )

    with pytest.raises(ValueError, match="READ_ONLY"):
        client.validate_sql("CREATE TABLE demo (id INT)")

    plan = client.dry_run_sql("CREATE TABLE demo (id INT)")
    assert plan["operation"] == "write"
    assert plan["requires_confirmation"] is True


def test_nemotron_client_uses_openai_compatible_settings() -> None:
    client = NemotronClient(
        base_url="https://example.com/v1",
        api_key="demo-key",
        model="meta/llama-3.1-8b-instruct",
    )

    assert client.base_url == "https://example.com/v1"
    assert client.api_key == "demo-key"
    assert client.model == "meta/llama-3.1-8b-instruct"


def test_supervisor_delegates_across_specialized_agents() -> None:
    supervisor = SupervisorAgent(
        zetaris_client=ZetarisClient(base_url="http://localhost:8888/api/v1.0", api_key="demo-key", org_id=1),
        llm_client=NemotronClient(base_url="https://example.com/v1", api_key="demo-key", model="demo-model"),
    )

    result = supervisor.run("Donne-moi le top 5 des ventes par région.")

    assert result["trace"]["agent_path"][0]["role"] == "guardian"
    assert result["trace"]["agent_path"][1]["role"] == "analyst"
    assert result["trace"]["agent_path"][2]["role"] == "explainability"
    assert "supervisor" in result["trace"]["summary"].lower()


def test_supervisor_delegates_etl_coder_tester_and_auditor() -> None:
    supervisor = SupervisorAgent(
        zetaris_client=ZetarisClient(base_url="http://localhost:8888/api/v1.0", api_key="demo-key", org_id=1),
        llm_client=NemotronClient(base_url="https://example.com/v1", api_key="demo-key", model="demo-model"),
    )

    result = supervisor.run("Crée un ETL pour transformer les données de vente et teste la conformité.")
    roles = [item["role"] for item in result["trace"]["agent_path"]]

    assert "coder" in roles
    assert "tester" in roles
    assert "auditor" in roles
