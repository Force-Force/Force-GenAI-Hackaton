"""Pipeline graph history: one snapshot per meaningful change, and rollback to any of them."""

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.edge import Edge
from app.models.enums import NodeStatus, NodeSubtype, NodeType
from app.models.node import Node
from app.models.pipeline import Pipeline
from app.models.pipeline_revision import PipelineRevision
from app.schemas.edge import EdgeRead
from app.schemas.node import NodeRead, Position
from app.schemas.revision import PipelineRevisionRead, RollbackResponse


async def _snapshot(db: AsyncSession, pipeline_id: UUID) -> dict:
    nodes = (await db.execute(select(Node).where(Node.pipeline_id == pipeline_id))).scalars().all()
    edges = (await db.execute(select(Edge).where(Edge.pipeline_id == pipeline_id))).scalars().all()
    return {
        "nodes": [
            NodeRead(
                id=n.id,
                type=n.type,
                subtype=n.subtype,
                label=n.label,
                position=Position(x=n.position_x, y=n.position_y),
                data=n.internal_data or {},
                status=n.status,
            ).model_dump(mode="json")
            for n in nodes
        ],
        "edges": [
            EdgeRead(id=e.id, source=e.source_node_id, target=e.target_node_id).model_dump(mode="json")
            for e in edges
        ],
    }


async def _latest_number(db: AsyncSession, pipeline_id: UUID) -> int:
    return await db.scalar(
        select(func.coalesce(func.max(PipelineRevision.revision), 0)).where(PipelineRevision.pipeline_id == pipeline_id)
    )


async def record_revision(
    db: AsyncSession,
    pipeline_id: UUID,
    title: str,
    operation: str,
    description: str = "",
    author_type: str = "USER",
    author_name: str = "AuraBI user",
) -> PipelineRevision:
    """Snapshot the pipeline graph as it stands after the change being recorded."""
    await db.flush()
    snapshot = await _snapshot(db, pipeline_id)
    revision = PipelineRevision(
        pipeline_id=pipeline_id,
        revision=await _latest_number(db, pipeline_id) + 1,
        title=title[:255],
        description=description,
        author_type=author_type,
        author_name=author_name,
        node_count=len(snapshot["nodes"]),
        edge_count=len(snapshot["edges"]),
        operations_summary=[operation],
        snapshot=snapshot,
    )
    db.add(revision)
    await db.flush()
    return revision


async def _pipeline_exists(db: AsyncSession, pipeline_id: UUID) -> None:
    if await db.scalar(select(Pipeline.id).where(Pipeline.id == pipeline_id)) is None:
        raise HTTPException(status_code=404, detail="Pipeline not found")


async def list_revisions(
    db: AsyncSession, pipeline_id: UUID, limit: int = 50, offset: int = 0
) -> list[PipelineRevisionRead]:
    await _pipeline_exists(db, pipeline_id)
    result = await db.execute(
        select(PipelineRevision)
        .where(PipelineRevision.pipeline_id == pipeline_id)
        .order_by(PipelineRevision.revision.desc())
        .limit(limit)
        .offset(offset)
    )
    return [PipelineRevisionRead.model_validate(r) for r in result.scalars().all()]


async def _get_revision(db: AsyncSession, pipeline_id: UUID, revision_id: UUID) -> PipelineRevision:
    revision = await db.scalar(
        select(PipelineRevision).where(
            PipelineRevision.id == revision_id, PipelineRevision.pipeline_id == pipeline_id
        )
    )
    if revision is None:
        raise HTTPException(status_code=404, detail="Revision not found")
    return revision


async def get_revision(db: AsyncSession, pipeline_id: UUID, revision_id: UUID) -> PipelineRevisionRead:
    return PipelineRevisionRead.model_validate(await _get_revision(db, pipeline_id, revision_id))


async def rollback(
    db: AsyncSession, pipeline_id: UUID, revision_id: UUID, reason: str | None = None
) -> RollbackResponse:
    """Replace the current graph with the target snapshot, keeping node and edge ids."""
    from app.services.pipeline_service import get_pipeline_or_404, pipeline_to_read
    from app.websocket.events import WsEvent, WsEventType
    from app.websocket.manager import ws_manager

    await _pipeline_exists(db, pipeline_id)
    target = await _get_revision(db, pipeline_id, revision_id)
    previous = await _latest_number(db, pipeline_id)

    await db.execute(delete(Edge).where(Edge.pipeline_id == pipeline_id))
    await db.execute(delete(Node).where(Node.pipeline_id == pipeline_id))
    for n in target.snapshot.get("nodes", []):
        db.add(
            Node(
                id=UUID(n["id"]),
                pipeline_id=pipeline_id,
                type=NodeType(n["type"]),
                subtype=NodeSubtype(n["subtype"]),
                label=n["label"],
                position_x=n["position"]["x"],
                position_y=n["position"]["y"],
                internal_data=n.get("data") or {},
                status=NodeStatus(n["status"]),
            )
        )
    await db.flush()
    for e in target.snapshot.get("edges", []):
        db.add(Edge(id=UUID(e["id"]), pipeline_id=pipeline_id, source_node_id=UUID(e["source"]), target_node_id=UUID(e["target"])))

    new = await record_revision(
        db,
        pipeline_id,
        f"Restauration de la révision {target.revision}",
        "pipeline.rollback",
        description=reason or "",
    )
    # Read everything needed from ORM objects before expiring them (async sessions cannot lazy-load).
    restored_number, restored_snapshot, new_number = target.revision, target.snapshot, new.revision

    db.expire_all()
    pipeline = await get_pipeline_or_404(db, pipeline_id)
    read = pipeline_to_read(pipeline)
    await ws_manager.broadcast(
        pipeline_id,
        WsEvent(type=WsEventType.PIPELINE_UPDATED, pipeline_id=str(pipeline_id), payload=read.model_dump(mode="json")),
    )
    return RollbackResponse(
        success=True,
        message=f"Graphe restauré à la révision {restored_number}.",
        previous_revision=previous,
        new_revision=new_number,
        restored_snapshot=restored_snapshot,
    )
