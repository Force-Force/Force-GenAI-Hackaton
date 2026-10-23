import uuid
from time import perf_counter

from fastapi import APIRouter, Header, HTTPException, Response

from app.analysis.agent import AnalysisAgent
from app.analysis.config import get_analysis_settings
from app.analysis.data import ZetarisClient
from app.analysis.model import NemotronClient
from app.schemas.analysis import AgentQueryRequest, AgentQueryResponse

router = APIRouter(tags=["analysis"])
_traces: dict[str, AgentQueryResponse] = {}


@router.post("/agent/query", response_model=AgentQueryResponse)
async def query_agent(
    payload: AgentQueryRequest,
    response: Response,
    x_request_id: str | None = Header(default=None),
) -> AgentQueryResponse:
    request_id = x_request_id or str(uuid.uuid4())
    started = perf_counter()
    try:
        settings = get_analysis_settings()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    zetaris = ZetarisClient(
        base_url=settings.resolved_zetaris_url,
        api_key=settings.zetaris_api_key,
        org_id=settings.zetaris_org_id,
        sql_endpoint=settings.zetaris_sql_endpoint,
    )
    llm = NemotronClient(
        base_url=settings.model_base_url,
        api_key=settings.model_api_key,
        model=settings.nemotron_model,
    )
    agent = AnalysisAgent(zetaris, llm, max_iterations=settings.max_agent_iterations)
    try:
        result = agent.run(payload.question, request_id=request_id)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Analyse externe indisponible.") from exc
    trace = result["trace"]
    trace["request_id"] = request_id
    trace["model"] = settings.nemotron_model
    trace["model_route"] = "configured"
    trace["latency_ms"] = round((perf_counter() - started) * 1000, 2)
    executed = trace.get("sql_executions", [])
    explain = AgentQueryResponse(
        response=result["response"],
        trace=trace,
        request_id=request_id,
        sql=executed[-1].get("sql") if executed else None,
        sources=["Zetaris"] if executed else [],
        model=settings.nemotron_model,
        model_route="configured",
        latency_ms=trace["latency_ms"],
        warnings=[] if executed else ["No Zetaris query was executed; factual claims may be incomplete."],
    )
    _traces[request_id] = explain
    response.headers["X-Request-ID"] = request_id
    return explain


@router.get("/agent/traces/{request_id}", response_model=AgentQueryResponse)
async def get_agent_trace(request_id: str) -> AgentQueryResponse:
    trace = _traces.get(request_id)
    if trace is None:
        raise HTTPException(status_code=404, detail="Trace not found.")
    return trace
