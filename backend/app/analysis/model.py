import logging
import time
from typing import Any

from openai import OpenAI, RateLimitError

logger = logging.getLogger(__name__)


class NemotronClient:
    def __init__(self, base_url: str, api_key: str, model: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model

    def _client(self) -> OpenAI:
        return OpenAI(base_url=self.base_url, api_key=self.api_key)

    def chat(self, messages: list[dict[str, Any]], temperature: float = 0.2, timeout: float = 90.0) -> Any:
        client = self._client()
        last_error: Exception | None = None
        for attempt in range(1, 4):
            try:
                return client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    timeout=timeout,
                )
            except RateLimitError as exc:
                last_error = exc
                if attempt == 3:
                    raise RuntimeError(
                        "Rate limit atteint sur la route Nemotron. Merci de patienter quelques instants puis relancer la demande."
                    ) from exc
                wait_seconds = 2 ** attempt
                logger.warning("Nemotron rate limit hit; retry in %ss", wait_seconds)
                time.sleep(wait_seconds)
            except Exception as exc:  # pragma: no cover - delegating to caller for explicit handling
                last_error = exc
                raise
        if last_error:
            raise RuntimeError(f"Nemotron request failed: {last_error}") from last_error
        raise RuntimeError("Nemotron request failed without concrete error.")

    def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        temperature: float = 0.2,
        timeout: float = 90.0,
    ) -> Any:
        client = self._client()
        last_error: Exception | None = None
        for attempt in range(1, 4):
            try:
                return client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=tools,
                    tool_choice="auto",
                    temperature=temperature,
                    timeout=timeout,
                )
            except RateLimitError as exc:
                last_error = exc
                if attempt == 3:
                    raise RuntimeError(
                        "Rate limit atteint sur la route Nemotron. Merci de patienter quelques instants puis relancer la demande."
                    ) from exc
                wait_seconds = 2 ** attempt
                logger.warning("Nemotron rate limit hit while calling tools; retry in %ss", wait_seconds)
                time.sleep(wait_seconds)
            except Exception as exc:  # pragma: no cover
                last_error = exc
                raise
        if last_error:
            raise RuntimeError(f"Nemotron tool call failed: {last_error}") from last_error
        raise RuntimeError("Nemotron tool call failed without concrete error.")
