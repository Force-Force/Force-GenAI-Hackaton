from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.enums import AgentRole, PipelineStatus
from app.services.agent_task_service import create_agent_task
from app.services.pipeline_service import get_pipeline_or_404
from app.services.plan_service import apply_plan_approval, build_agentic_plan

router = APIRouter(prefix="/pipelines/{pipeline_id}", tags=["plan"])


class PlanGenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    attachedSourceIds: list[str] | None = None


class PlanApproveRequest(BaseModel):
    planId: str
    selectedAnswers: dict[str, Any] = Field(default_factory=dict)
    selectedKpiIds: list[str] = Field(default_factory=list)


@router.post("/plan/generate")
async def generate_plan(
    pipeline_id: UUID,
    body: PlanGenerateRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    await get_pipeline_or_404(db, pipeline_id)
    plan = build_agentic_plan(body.prompt, body.attachedSourceIds or [])
    tasks = []
    for role in plan["task_roles"]:
        task = await create_agent_task(
            db,
            pipeline_id,
            AgentRole(role),
            f"Agentic task for {role.lower()} : {body.prompt}",
            input_payload={"plan": plan, "source_ids": body.attachedSourceIds or []},
        )
        tasks.append({
            "id": str(task.id),
            "agent_role": task.agent_role.value,
            "instruction": task.instruction,
            "status": task.status.value,
        })

    uiop = {
        "protocol": "uiop",
        "version": "1.0",
        "messageId": f"msg_plan_{pipeline_id}",
        "workspaceId": str(pipeline_id),
        "baseRevision": 1,
        "source": {"agentId": "planner-agent", "executionId": "exec_plan_generate"},
        "operations": [
            {"op": "plan.create", "params": plan},
            {"op": "question.propose", "params": {"id": "scd-strategy", "question": "Which SCD strategy do you want?", "options": ["scd-1", "scd-2"]}},
        ],
    }
    return {"reply": "Plan agentique créé et tâches assignées aux agents spécialisés.", "plan": plan, "tasks": tasks, "uiop": uiop}


@router.post("/plan/approve")
async def approve_plan(
    pipeline_id: UUID,
    body: PlanApproveRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    pipeline = await get_pipeline_or_404(db, pipeline_id)
    current = pipeline.architecture_design or {}
    plan = current.get("plan") or build_agentic_plan("Pipeline approved", [])
    approved = apply_plan_approval(
        plan,
        plan_id=body.planId,
        selected_answers=body.selectedAnswers,
        selected_kpi_ids=body.selectedKpiIds,
    )
    pipeline.status = PipelineStatus.ACTIVE
    pipeline.architecture_design = {
        **current,
        "plan": plan,
        "approval": approved,
        "selectedAnswers": body.selectedAnswers,
        "selectedKpiIds": body.selectedKpiIds,
    }
    await db.flush()

    for role in (AgentRole.QA.value, AgentRole.AUDITOR.value):
        await create_agent_task(
            db,
            pipeline_id,
            AgentRole(role),
            f"Validation post-approval for {role.lower()} on pipeline {pipeline.name}",
            input_payload={"approval": approved},
        )

    return {"status": "ACTIVE", "approval": approved, "pipeline": {"id": str(pipeline_id), "status": pipeline.status.value}}
