from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.enums import PipelineRunStatus
from app.schemas.execution import (
    GuardianQuestionAnswer,
    PipelineRunRead,
    PipelineRunStartResponse,
)
from app.services import execution_service

router = APIRouter(prefix="/pipelines/{pipeline_id}/runs", tags=["execution"])


@router.post("", response_model=PipelineRunStartResponse, status_code=201)
async def start_run(pipeline_id: UUID, db: AsyncSession = Depends(get_db)) -> PipelineRunStartResponse:
    run = await execution_service.start_pipeline_run(db, pipeline_id)
    return PipelineRunStartResponse(
        run=run,
        message="Exécution démarrée. Approuvez les demandes Guardian puis appelez POST .../resume.",
    )


@router.get("", response_model=list[PipelineRunRead])
async def list_runs(
    pipeline_id: UUID,
    status: PipelineRunStatus | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[PipelineRunRead]:
    return await execution_service.list_runs(db, pipeline_id, status, limit, offset)


@router.get("/{run_id}", response_model=PipelineRunRead)
async def get_run(pipeline_id: UUID, run_id: UUID, db: AsyncSession = Depends(get_db)) -> PipelineRunRead:
    return await execution_service.get_run(db, pipeline_id, run_id)


@router.post("/{run_id}/resume", response_model=PipelineRunRead)
async def resume_run(pipeline_id: UUID, run_id: UUID, db: AsyncSession = Depends(get_db)) -> PipelineRunRead:
    return await execution_service.resume_pipeline_run(db, pipeline_id, run_id)


@router.post("/{run_id}/answer", response_model=PipelineRunRead)
async def answer_question(
    pipeline_id: UUID,
    run_id: UUID,
    body: GuardianQuestionAnswer,
    db: AsyncSession = Depends(get_db),
) -> PipelineRunRead:
    return await execution_service.answer_guardian_question(
        db, pipeline_id, run_id, body.question_id, body.answer
    )
