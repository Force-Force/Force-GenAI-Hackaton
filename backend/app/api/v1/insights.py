import asyncio
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.analysis.data import ZetarisError
from app.api.deps import get_db
from app.services import insights_service
from app.services.pipeline_service import get_pipeline_or_404

router = APIRouter(prefix="/pipelines/{pipeline_id}/insights", tags=["insights"])


@router.get("")
async def get_insights(pipeline_id: UUID, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """KPI cards and charts computed by Zetaris (UIOP envelope + raw cards/insights)."""
    await get_pipeline_or_404(db, pipeline_id)
    try:
        return await asyncio.to_thread(insights_service.pipeline_insights, str(pipeline_id))
    except ZetarisError as exc:
        raise HTTPException(status_code=502, detail=f"Zetaris : {exc} {exc.detail}".strip()) from exc
