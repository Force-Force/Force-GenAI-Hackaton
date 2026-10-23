from typing import Any

from pydantic import BaseModel, Field


class AgentQueryRequest(BaseModel):
    question: str = Field(min_length=1)


class AgentQueryResponse(BaseModel):
    request_id: str
    status: str = "ok"
    response: str
    trace: dict[str, Any]
