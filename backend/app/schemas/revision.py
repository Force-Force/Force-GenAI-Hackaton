from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class PipelineRevisionRead(BaseModel):
    id: UUID
    revision: int
    pipeline_id: UUID
    title: str
    description: str = ""
    author_type: str
    author_name: str
    created_at: datetime
    node_count: int
    edge_count: int
    stage_count: int = 0
    operations_summary: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    snapshot: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class RollbackRequest(BaseModel):
    reason: str | None = None


class RollbackResponse(BaseModel):
    success: bool
    message: str
    previous_revision: int
    new_revision: int
    restored_snapshot: dict[str, Any] | None = None
