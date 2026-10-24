from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.enums import ChatSender


class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=1)

    @field_validator("content")
    @classmethod
    def content_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("content must not be blank")
        return value


class ChatMessageRead(BaseModel):
    id: UUID
    pipeline_id: UUID
    sender: ChatSender
    content_md: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    user_message: ChatMessageRead
    agent_message: ChatMessageRead
    agent_tasks: list["AgentTaskRead"] = Field(default_factory=list)


from app.schemas.agent_task import AgentTaskRead  # noqa: E402

ChatResponse.model_rebuild()
