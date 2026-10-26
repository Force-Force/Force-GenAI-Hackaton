import base64
import json
import time
from types import SimpleNamespace

import pytest
import requests

from app.analysis import data as zetaris_data
from app.analysis.agent import AnalysisAgent
from app.analysis.data import ZetarisClient, ZetarisError


class FakeResponse:
    def __init__(self, status: int, body: dict) -> None:
        self.status_code = status
        self._body = body
        self.text = json.dumps(body)

    def json(self) -> dict:
        return self._body

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise requests.HTTPError(response=self)


def jwt(exp: float) -> str:
    payload = base64.urlsafe_b64encode(json.dumps({"exp": exp}).encode()).decode().rstrip("=")
    return f"header.{payload}.signature"


@pytest.fixture(autouse=True)
def clear_token_cache():
    zetaris_data._TOKEN_CACHE.clear()
    yield
    zetaris_data._TOKEN_CACHE.clear()


def login_client() -> ZetarisClient:
    return ZetarisClient(
        "http://zetaris/api/v1.0", "", auth_url="http://zetaris/login", username="admin", password="secret"
    )


def test_rows_are_returned_as_typed_records() -> None:
    body = {"headers": ["id", "city", "amount", "iban"], "data": [["7", "Douala", "12.50", "0012345678901234"]]}
    assert ZetarisClient._records(body) == [{"id": 7, "city": "Douala", "amount": 12.5, "iban": "0012345678901234"}]


def test_login_token_is_cached_and_org_comes_from_login(monkeypatch) -> None:
    calls: list[str] = []

    def fake_post(url, headers=None, json=None, timeout=None):
        calls.append(url)
        if url.endswith("/login"):
            return FakeResponse(200, {"idToken": jwt(time.time() + 900), "orgId": 4})
        assert headers["Authorization"].startswith("Bearer header.")
        assert headers["X-Org-ID"] == "4"
        return FakeResponse(200, {"headers": ["ok"], "data": [["1"]]})

    monkeypatch.setattr(zetaris_data.requests, "post", fake_post)
    client = login_client()
    assert client.run_sql("SELECT 1 AS ok") == [{"ok": 1}]
    assert client.run_sql("SELECT 1 AS ok") == [{"ok": 1}]
    assert calls.count("http://zetaris/login") == 1


def test_expired_session_signs_in_again_once(monkeypatch) -> None:
    sql_calls = {"n": 0}

    def fake_post(url, headers=None, json=None, timeout=None):
        if url.endswith("/login"):
            return FakeResponse(200, {"idToken": jwt(time.time() + 900), "orgId": 1})
        sql_calls["n"] += 1
        if sql_calls["n"] == 1:
            return FakeResponse(401, {"msg": "token expired"})
        return FakeResponse(200, {"headers": ["n"], "data": [["3"]]})

    monkeypatch.setattr(zetaris_data.requests, "post", fake_post)
    assert login_client().run_sql("SELECT 3 AS n") == [{"n": 3}]
    assert sql_calls["n"] == 2


def test_sql_error_keeps_engine_message_without_stack(monkeypatch) -> None:
    message = (
        "org.apache.hive.service.cli.HiveSQLException: com.zetaris.lightning.sql.parser.ddl."
        "LightningDdlParseException: \nno viable alternative at input 'selec'(line 1, pos 0)\n\n== SQL ==\nselec"
        "\n\tat org.apache.spark.Foo.run(Foo.scala:1)"
    )
    monkeypatch.setattr(
        zetaris_data.requests, "post", lambda *a, **k: FakeResponse(400, {"msg": message})
    )
    client = ZetarisClient("http://zetaris/api/v1.0", "static-key")
    with pytest.raises(ZetarisError) as caught:
        client.run_sql("SELECT x FROM y")
    assert caught.value.category == "provider"
    assert caught.value.detail == "no viable alternative at input 'selec'(line 1, pos 0)"


def test_nemotron_client_sends_the_tool_definitions(monkeypatch) -> None:
    from app.analysis import model as model_module

    sent: dict = {}

    class FakeCompletions:
        def create(self, **request):
            sent.update(request)
            return SimpleNamespace(usage=None)

    fake_openai = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))
    monkeypatch.setattr(model_module, "OpenAI", lambda **kwargs: fake_openai)
    tools = [{"type": "function", "function": {"name": "run_sql", "parameters": {"type": "object"}}}]

    model_module.NemotronClient("http://nim/v1", "key", "nemotron").chat_with_tools([{"role": "user", "content": "?"}], tools)

    assert sent["tools"] == tools
    assert sent["tool_choice"] == "auto"


class ScriptedLlm:
    provider = "nvidia"

    def __init__(self, sql: str) -> None:
        self.sql = sql
        self.calls = 0
        self.last_call_metadata: dict = {}
        self.tool_results: list[str] = []

    def chat_with_tools(self, messages, tools):
        self.calls += 1
        if messages[-1]["role"] == "tool":
            self.tool_results.append(messages[-1]["content"])
        if self.calls == 1:
            call = SimpleNamespace(id="c1", function=SimpleNamespace(name="run_sql", arguments=json.dumps({"sql": self.sql})))
            message = SimpleNamespace(content=None, tool_calls=[call])
        else:
            message = SimpleNamespace(content="Réponse finale.", tool_calls=[])
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


class NullMemory:
    def retrieve(self, *args, **kwargs):
        return []

    def remember(self, *args, **kwargs):
        return None


def test_agent_returns_sql_errors_to_the_model(monkeypatch) -> None:
    error = ZetarisError("refused", category="provider", request_id="r")
    error.detail = "Column 'amout' does not exist"

    zetaris = ZetarisClient("http://zetaris/api/v1.0", "static-key")
    monkeypatch.setattr(zetaris, "run_sql", lambda **kwargs: (_ for _ in ()).throw(error))
    llm = ScriptedLlm("SELECT amout FROM BANK.transactions")

    result = AnalysisAgent(zetaris, llm, memory_store=NullMemory()).run("Quel est le montant moyen ?")

    assert result["response"] == "Réponse finale."
    assert json.loads(llm.tool_results[0]) == {"error": "Column 'amout' does not exist"}
    assert result["trace"]["sql_executions"][0]["error"] == "Column 'amout' does not exist"


def test_agent_does_not_mask_authentication_failures(monkeypatch) -> None:
    error = ZetarisError("denied", category="authentication", request_id="r")
    zetaris = ZetarisClient("http://zetaris/api/v1.0", "static-key")
    monkeypatch.setattr(zetaris, "run_sql", lambda **kwargs: (_ for _ in ()).throw(error))

    with pytest.raises(ZetarisError):
        AnalysisAgent(zetaris, ScriptedLlm("SELECT 1"), memory_store=NullMemory()).run("Combien de clients ?")


def test_zetaris_login_defaults_to_the_bundled_platform(tmp_path, monkeypatch) -> None:
    from app.analysis.config import AnalysisSettings
    from app.config import Settings

    platform_env = tmp_path / "zetaris.env"
    platform_env.write_text("POSTGRES_USER=zetaris\nZETARIS_ADMIN_EMAIL=admin@zetaris.com\nZETARIS_ADMIN_PASSWORD=Secret1@\n")
    for name in ("ZETARIS_USERNAME", "ZETARIS_PASSWORD"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("ZETARIS_PLATFORM_ENV", str(platform_env))

    for settings in (AnalysisSettings(_env_file=None), Settings(_env_file=None)):
        assert (settings.zetaris_username, settings.zetaris_password) == ("admin@zetaris.com", "Secret1@")

    monkeypatch.setenv("ZETARIS_PASSWORD", "explicit")
    assert AnalysisSettings(_env_file=None).zetaris_password == "explicit"
