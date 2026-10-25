import asyncio
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_message import ChatMessage
from app.models.enums import ChatSender
from app.schemas.chat import ChatMessageRead, ChatResponse
from app.services.pipeline_service import get_pipeline_or_404
from app.analysis.agent import AnalysisAgent
from app.analysis.config import get_analysis_settings
from app.analysis.data import ZetarisClient
from app.analysis.model import NemotronClient
from app.meterless.memory import HMemMemoryStore
from app.websocket.events import WsEvent, WsEventType
from app.websocket.manager import ws_manager


def chat_message_to_read(msg: ChatMessage) -> ChatMessageRead:
    return ChatMessageRead(
        id=msg.id,
        pipeline_id=msg.pipeline_id,
        sender=msg.sender,
        content_md=msg.content_md,
        metadata=msg.metadata_ or {},
        created_at=msg.created_at,
    )


async def list_chat_messages(db: AsyncSession, pipeline_id: UUID) -> list[ChatMessageRead]:
    await get_pipeline_or_404(db, pipeline_id)
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.pipeline_id == pipeline_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return [chat_message_to_read(m) for m in result.scalars().all()]


async def handle_chat_message(db: AsyncSession, pipeline_id: UUID, content: str) -> ChatResponse:
    await get_pipeline_or_404(db, pipeline_id)

    user_msg = ChatMessage(
        pipeline_id=pipeline_id,
        sender=ChatSender.USER,
        content_md=content,
    )
    db.add(user_msg)
    await db.flush()

    agent_metadata: dict = {"architecture": "analysis"}
    try:
        settings = get_analysis_settings()
        model_base_url, model_api_key, model_name = settings.active_model_config
        agent = AnalysisAgent(
            ZetarisClient(
                settings.resolved_zetaris_url,
                settings.zetaris_api_key,
                settings.zetaris_org_id,
                settings.zetaris_sql_endpoint,
            ),
            NemotronClient(
                model_base_url,
                model_api_key,
                model_name,
                provider=settings.model_provider,
            ),
            max_iterations=settings.max_agent_iterations,
            memory_store=HMemMemoryStore(settings.meterless_memory_log),
        )
        result = await asyncio.to_thread(agent.run, content)
        agent_reply_content = result["response"]
        agent_metadata["trace"] = result["trace"]
    except (RuntimeError, ValueError) as exc:
        agent_reply_content = f"Analyse indisponible : {exc}"
        agent_metadata["status"] = "failed"

    agent_msg = ChatMessage(
        pipeline_id=pipeline_id,
        sender=ChatSender.MASTER_AGENT,
        content_md=agent_reply_content,
        metadata_=agent_metadata,
    )
    db.add(agent_msg)
    await db.flush()

    user_read = chat_message_to_read(user_msg)
    agent_read = chat_message_to_read(agent_msg)

    for msg_read in (user_read, agent_read):
        await ws_manager.broadcast(
            pipeline_id,
            WsEvent(
                type=WsEventType.CHAT_MESSAGE,
                pipeline_id=str(pipeline_id),
                payload=msg_read.model_dump(mode="json"),
            ),
        )

    return ChatResponse(user_message=user_read, agent_message=agent_read, agent_tasks=[])
