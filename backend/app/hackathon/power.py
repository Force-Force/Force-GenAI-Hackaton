import logging
import time
from typing import Any

from openai import OpenAI, RateLimitError

logger = logging.getLogger(__name__)


class NemotronClient:
    def __init__(self, base_url: str, api_key: str, model: str, provider: str = "nvidia") -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.provider = provider
        self.last_call_metadata: dict[str, Any] = {}

    def _client(self) -> OpenAI:
        return OpenAI(base_url=self.base_url, api_key=self.api_key)

    def chat(self, messages: list[dict[str, Any]], temperature: float = 0.2, timeout: float = 90.0) -> Any:
        return self._complete(
            messages=messages,
            temperature=temperature,
            timeout=timeout,
        )

    def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        temperature: float = 0.2,
        timeout: float = 90.0,
    ) -> Any:
        return self._complete(
            messages=messages,
            tools=tools,
            temperature=temperature,
            timeout=timeout,
        )

    def _complete(
        self,
        messages: list[dict[str, Any]],
        temperature: float,
        timeout: float,
        tools: list[dict[str, Any]] | None = None,
    ) -> Any:
        client = self._client()
        last_error: Exception | None = None
        for attempt in range(1, 4):
            started = time.perf_counter()
            try:
                request: dict[str, Any] = {
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature,
                    "timeout": timeout,
                }
                if tools is not None:
                    request["tools"] = tools
                    request["tool_choice"] = "auto"
                response = client.chat.completions.create(**request)
                usage = getattr(response, "usage", None)
                self.last_call_metadata = {
                    "provider": self.provider,
                    "model": self.model,
                    "latency_ms": round((time.perf_counter() - started) * 1000, 2),
                    "tokens_in": getattr(usage, "prompt_tokens", None),
                    "tokens_out": getattr(usage, "completion_tokens", None),
                    "tool_call": tools is not None,
                }
                return response
            except RateLimitError as exc:
                last_error = exc
                if attempt == 3:
                    raise RuntimeError(
                        "Rate limit atteint sur la route Nemotron. Merci de patienter quelques instants puis relancer la demande."
                    ) from exc
                wait_seconds = 2 ** attempt
                logger.warning("Nemotron rate limit hit; retry in %ss", wait_seconds)
                time.sleep(wait_seconds)
            except Exception as exc:  # pragma: no cover - caller surfaces provider errors
                last_error = exc
                raise
        if last_error:
            raise RuntimeError(f"Nemotron request failed: {last_error}") from last_error
        raise RuntimeError("Nemotron request failed without concrete error.")
