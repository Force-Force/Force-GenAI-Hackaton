"""Deterministic questions for workflow decisions requiring user input."""

from __future__ import annotations

from typing import Any

from app.models.enums import AgentRole, WorkflowPhase


def _fallback_questions(
    agent_role: AgentRole,
    context: dict[str, Any],
    phase: WorkflowPhase,
    instruction: str | None,
) -> list[dict[str, Any]]:
    questions: list[dict[str, Any]] = []
    gaps = context.get("gaps") or []

    if phase == WorkflowPhase.INITIAL_STUDY:
        primary = (context.get("live_data_profile") or {}).get("primary_source") or {}
        if primary.get("connected") and primary.get("column_names"):
            columns = primary["column_names"][:6]
            questions.append(
                {
                    "text": (
                        f"La source `{primary.get('qualified_name')}` contient "
                        f"{primary.get('row_count', 0)} lignes. Quelle colonne est l'identifiant métier ?"
                    ),
                    "choices": columns,
                }
            )
        if "Aucun nœud SOURCE" in " ".join(gaps):
            questions.append(
                {
                    "text": "Quelle sera la source principale des données ?",
                    "choices": ["CSV / fichier", "API REST", "PostgreSQL", "Autre"],
                }
            )
        if context.get("pii_total", 0) > 0 and agent_role in (AgentRole.GUARDIAN, AgentRole.PROFILER):
            questions.append(
                {
                    "text": "Des données personnelles ont été détectées. Quel niveau de masquage appliquer ?",
                    "choices": ["Masquage strict", "Masquage partiel", "Anonymisation complète"],
                }
            )
        for node in context.get("nodes", [])[:2]:
            columns = node.get("columns")
            if columns:
                questions.append(
                    {
                        "text": f"Sur le nœud « {node.get('label')} », quelle colonne identifie le client ?",
                        "choices": [str(column) for column in columns[:5]],
                    }
                )
                break

    if phase == WorkflowPhase.NODE_EXECUTION and context.get("current_node", {}).get("pii_count", 0) > 0:
        questions.append(
            {
                "text": "Ce nœud contient des PII. Confirmez-vous la poursuite avec masquage RGPD ?",
                "choices": ["Oui, avec masquage", "Non, arrêter le pipeline"],
            }
        )

    if phase == WorkflowPhase.AGENT_TASK and instruction:
        if agent_role == AgentRole.PROFILER and "profil" in instruction.lower() and not context.get("nodes"):
            questions.append({"text": "Quels fichiers ou tables souhaitez-vous profiler ?", "choices": []})
        if agent_role == AgentRole.GUARDIAN and context.get("pii_total", 0) > 0:
            questions.append(
                {
                    "text": f"{instruction[:200]} — Validez-vous l'analyse conformité ?",
                    "choices": ["Oui", "Non, revoir le schéma"],
                }
            )

    return questions[:3]


async def generate_contextual_questions(
    agent_role: AgentRole,
    context: dict[str, Any],
    phase: WorkflowPhase,
    instruction: str | None = None,
    *,
    max_questions: int = 3,
) -> list[dict[str, Any]]:
    return _fallback_questions(agent_role, context, phase, instruction)[:max_questions]
