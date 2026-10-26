from uuid import UUID

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.revision import PipelineRevisionRead, RollbackRequest, RollbackResponse
from app.services import revision_service

router = APIRouter(prefix="/pipelines/{pipeline_id}/revisions", tags=["revisions"])


@router.get("", response_model=list[PipelineRevisionRead])
async def list_revisions(
    pipeline_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[PipelineRevisionRead]:
    return await revision_service.list_revisions(db, pipeline_id, limit, offset)


@router.get("/{revision_id}", response_model=PipelineRevisionRead)
async def get_revision(pipeline_id: UUID, revision_id: UUID, db: AsyncSession = Depends(get_db)) -> PipelineRevisionRead:
    return await revision_service.get_revision(db, pipeline_id, revision_id)


@router.post("/{revision_id}/rollback", response_model=RollbackResponse)
async def rollback_revision(
    pipeline_id: UUID,
    revision_id: UUID,
    body: RollbackRequest = Body(default_factory=RollbackRequest),
    db: AsyncSession = Depends(get_db),
) -> RollbackResponse:
    return await revision_service.rollback(db, pipeline_id, revision_id, body.reason)
