from __future__ import annotations

import asyncio
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.analysis.config import get_analysis_settings
from app.analysis.data import ZetarisClient
from app.analysis.model import NemotronClient
from app.analysis.planner import PlannerAgent, plan_markdown
from app.api.deps import get_db
from app.models.enums import AgentRole, PipelineStatus, UserQuestionStatus, WorkflowPhase
from app.models.user_question import UserQuestion
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
    """Nemotron designs the plan from the request and the live Zetaris catalog; KPIs are measured on Zetaris."""
    pipeline = await get_pipeline_or_404(db, pipeline_id)
    try:
        settings = get_analysis_settings()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    base_url, api_key, model = settings.active_model_config
    planner = PlannerAgent(
        ZetarisClient.from_settings(settings),
        NemotronClient(base_url, api_key, model, provider=settings.model_provider),
        settings.zetaris_bank_database,
    )
    try:
        plan = await asyncio.to_thread(planner.plan, body.prompt)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"Planification indisponible : {exc}") from exc

    # Decision questions are real user questions: answers are stored like any other.
    await db.execute(
        delete(UserQuestion).where(
            UserQuestion.pipeline_id == pipeline_id,
            UserQuestion.status == UserQuestionStatus.PENDING,
            UserQuestion.context_snapshot["source"].astext == "planner",
        )
    )
    proposals = []
    for q in plan["questions"]:
        row = UserQuestion(
            pipeline_id=pipeline_id,
            agent_role=AgentRole.ENGINEER,
            phase=WorkflowPhase.AGENT_TASK,
            question_text=q["question"],
            context_snapshot={"source": "planner", "plan_id": plan["planId"], "context": q["context"]},
            choices=q["options"],
            status=UserQuestionStatus.PENDING,
        )
        db.add(row)
        await db.flush()
        proposals.append({
            "id": str(row.id),
            "question": q["question"],
            "context": q["context"],
            "options": [
                {"id": o, "label": o, "description": "", "isRecommended": o == q["recommended"]}
                for o in q["options"]
            ],
        })

    markdown = plan_markdown(plan)
    pipeline.architecture_design = {
        **(pipeline.architecture_design or {}),
        # Same shape as the frontend plan store, so reopening the pipeline restores the plan.
        "plan": {
            "planId": plan["planId"],
            "planTitle": plan["title"],
            "planPrompt": plan["prompt"],
            "planSummary": plan["summary"],
            "stages": plan["stages"],
            "reasoningPhases": plan["reasoningPhases"],
            "kpis": plan["kpis"],
            "selectedKpiIds": plan["verifiedKpiIds"],
            "compiledSql": plan["compiledSql"],
            "planMarkdown": markdown,
            "questions": proposals,
        },
    }
    await db.flush()

    tables = sorted({t for s in plan["stages"] for t in s["tables"]})
    assignments = {
        AgentRole.PROFILER: f"Profiler les sources : {', '.join(tables) or 'catalogue Zetaris'}.",
        AgentRole.ENGINEER: "Construire les étapes : " + " → ".join(s["title"] for s in plan["stages"]) + ".",
        AgentRole.GUARDIAN: "Contrôler données personnelles, accès en lecture seule et approbations avant exécution.",
    }
    tasks = []
    for role, instruction in assignments.items():
        task = await create_agent_task(db, pipeline_id, role, instruction, input_payload={"plan_id": plan["planId"]})
        tasks.append({
            "id": str(task.id),
            "agent_role": task.agent_role.value,
            "instruction": task.instruction,
            "status": task.status.value,
        })

    operations: list[dict[str, Any]] = [
        {"op": "plan.create", "params": {
            "id": plan["planId"], "title": plan["title"], "prompt": plan["prompt"], "summary": plan["summary"],
            "stages": plan["stages"], "reasoningPhases": plan["reasoningPhases"], "kpis": plan["kpis"],
            "compiledSql": plan["compiledSql"],
        }},
        {"op": "plan.update", "params": {"selectedKpiIds": plan["verifiedKpiIds"]}},
    ]
    operations += [{"op": "question.propose", "params": p} for p in proposals]
    verified = len(plan["verifiedKpiIds"])
    return {
        "reply": (
            f"Plan « {plan['title']} » : {len(plan['stages'])} étapes, {verified}/{len(plan['kpis'])} KPI "
            f"mesurés sur Zetaris, {len(proposals)} décision(s) à valider."
        ),
        "plan": plan,
        "markdown": markdown,
        "tasks": tasks,
        "uiop": {
            "protocol": "uiop",
            "version": "1.0",
            "messageId": f"msg_{plan['planId']}",
            "workspaceId": str(pipeline_id),
            "baseRevision": 0,
            "source": {"agentId": "planner-agent", "executionId": plan["planId"]},
            "operations": operations,
        },
    }


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
