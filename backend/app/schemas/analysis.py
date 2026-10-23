from typing import Any

from pydantic import BaseModel, Field


class AgentQueryRequest(BaseModel):
    question: str = Field(min_length=1)


class AgentQueryResponse(BaseModel):
    response: str
    trace: dict[str, Any]
    request_id: str | None = None
    status: str = "completed"
    sql: str | None = None
    sources: list[str] = Field(default_factory=list)
    views_used: list[str] = Field(default_factory=list)
    model: str | None = None
    model_route: str | None = None
    latency_ms: float | None = None
    tokens_in: int | None = None
    tokens_out: int | None = None
    calculations: list[dict[str, Any]] = Field(default_factory=list)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    provider: str | None = None
    intent: str | None = None
    risk_level: str | None = None
    approval_required: bool = False
