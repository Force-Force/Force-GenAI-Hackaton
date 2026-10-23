from fastapi import APIRouter, HTTPException

from app.hackathon.agent import HackathonAgent
from app.hackathon.config import get_hackathon_settings
from app.hackathon.data import ZetarisClient
from app.hackathon.power import NemotronClient
from app.schemas.hackathon import AgentQueryRequest, AgentQueryResponse

router = APIRouter(tags=["hackathon"])


@router.post("/agent/query", response_model=AgentQueryResponse)
async def query_agent(payload: AgentQueryRequest) -> AgentQueryResponse:
    try:
        settings = get_hackathon_settings()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    zetaris = ZetarisClient(
        base_url=settings.zetaris_rest_url,
        api_key=settings.zetaris_api_key,
        org_id=settings.zetaris_org_id,
    )
    llm = NemotronClient(
        base_url=settings.model_base_url,
        api_key=settings.model_api_key,
        model=settings.nemotron_model,
    )
    agent = HackathonAgent(zetaris, llm, max_iterations=settings.max_agent_iterations)
    result = agent.run(payload.question)
    return AgentQueryResponse(
        request_id=result.get("request_id") or "unknown",
        status=result.get("status", "ok"),
        response=result["response"],
        trace=result["trace"],
    )
