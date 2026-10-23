import os
import sys
from typing import Callable

import requests
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


def truncate(text: str, max_len: int = 300) -> str:
    return text if len(text) <= max_len else text[:max_len] + "..."


def check(label: str, fn: Callable[[], None]) -> None:
    try:
        fn()
        print(f"PASS: {label}")
    except Exception as exc:  # pragma: no cover - smoke test feedback only
        print(f"FAIL: {label} -> {truncate(str(exc))}")


def check_zetaris_frontend() -> None:
    response = requests.get("http://localhost:3000", timeout=10)
    response.raise_for_status()


def check_zetaris_select_one() -> None:
    zetaris_url = os.getenv("ZETARIS_REST_URL", "http://localhost:8888/api/v1.0")
    org_id = os.getenv("ZETARIS_ORG_ID", "1")
    api_key = os.getenv("ZETARIS_API_KEY")
    if not api_key:
        raise RuntimeError("ZETARIS_API_KEY is not configured in .env")

    payload = {"queryId": "00000000-0000-0000-0000-000000000001", "sql": "SELECT 1", "source": "SqlEditor", "limit": 10}
    response = requests.post(
        f"{zetaris_url}/sql-editor/sqls/run",
        headers={
            "Authorization": f"Bearer {api_key}",
            "X-Org-ID": org_id,
            "X-Request-ID": "00000000-0000-0000-0000-000000000002",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    body = response.json()
    if "data" not in body:
        raise RuntimeError("Zetaris response does not include a data field")


def check_nemotron_simple_message() -> None:
    base_url = os.getenv("MODEL_BASE_URL")
    api_key = os.getenv("MODEL_API_KEY")
    model = os.getenv("NEMOTRON_MODEL")
    if not base_url or not api_key or not model:
        raise RuntimeError("MODEL_BASE_URL, MODEL_API_KEY or NEMOTRON_MODEL is not configured in .env")

    client = OpenAI(base_url=base_url, api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": "Réponds en une phrase : bonjour."}],
        temperature=0.2,
        timeout=90,
    )
    if not response.choices or not response.choices[0].message.content:
        raise RuntimeError("Nemotron response is empty")


if __name__ == "__main__":
    check("Zetaris UI", check_zetaris_frontend)
    check("Zetaris SELECT 1", check_zetaris_select_one)
    check("Nemotron message", check_nemotron_simple_message)
    sys.exit(0)
