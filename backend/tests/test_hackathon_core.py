import pytest

from app.hackathon.data import ZetarisClient
from app.hackathon.power import NemotronClient


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
