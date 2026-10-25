import pytest

from app.analysis.data import ZetarisClient
from app.analysis.calculations import calculate_margin, compare_margin_periods
from app.analysis.model import NemotronClient


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


def test_nemotron_client_uses_compatible_settings() -> None:
    client = NemotronClient(
        base_url="https://example.com/v1",
        api_key="demo-key",
        model="meta/llama-3.1-8b-instruct",
    )

    assert client.base_url == "https://example.com/v1"
    assert client.api_key == "demo-key"
    assert client.model == "meta/llama-3.1-8b-instruct"


def test_zetaris_rejects_multiple_statements_but_allows_quoted_semicolon() -> None:
    client = ZetarisClient(base_url="http://localhost:8888/api/v1.0", api_key="demo-key")

    with pytest.raises(ValueError, match="une seule"):
        client.validate_sql("SELECT 1; DROP TABLE users")

    assert client.validate_sql("SELECT 'value;still-one'") == "SELECT 'value;still-one'"


def test_margin_calculation_is_deterministic_and_guards_zero_revenue() -> None:
    result = calculate_margin({"revenue": "100", "cost_of_goods_sold": "40"})
    assert result.gross_margin == 60
    assert result.gross_margin_percentage == 60

    zero = calculate_margin({"revenue": 0, "cogs": 5})
    assert zero.gross_margin == -5
    assert zero.gross_margin_percentage is None


def test_margin_period_change_links_to_two_input_periods() -> None:
    result = compare_margin_periods(
        {"revenue": 100, "cost_of_goods_sold": 40},
        {"revenue": 100, "cost_of_goods_sold": 30},
    )
    assert result["period_change"]["gross_margin"] == "-10"
