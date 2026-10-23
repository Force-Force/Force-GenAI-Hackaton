from pydantic import BaseModel, Field


class AgentQueryRequest(BaseModel):
    question: str = Field(min_length=1)


class AgentQueryResponse(BaseModel):
    response: str
    trace: dict
