import json
import uuid
from typing import Any

from app.analysis.data import ZetarisClient
from app.analysis.intent import ScoutIntentEngine
from app.analysis.model import NemotronClient
from app.meterless.memory import HMemMemoryStore

TOOL_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "run_sql",
            "description": "Interroge Zetaris pour récupérer des faits. Seules les requêtes SELECT, SHOW et DESCRIBE sont autorisées.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sql": {"type": "string", "description": "Requête SQL de lecture seule à exécuter sur Zetaris."},
                    "limit": {"type": "integer", "default": 100, "description": "Nombre maximum de lignes à renvoyer."},
                    "confirmed": {"type": "boolean", "default": False, "description": "À passer à true uniquement pour une requête d'écriture explicitement autorisée."},
                },
                "required": ["sql"],
            },
        },
    }
]

SYSTEM_PROMPT = """Tu es un assistant d'analyse de données pour AuraBI.

Règles prioritaires :
1. Base-toi d'abord sur Zetaris pour tous les faits.
2. N'affirme rien sans donnée issue de Zetaris.
3. Utilise l'outil run_sql pour interroger Zetaris lorsque tu as besoin de faits.
4. Si la requête SQL n'est pas de lecture, refuse-la et demande une confirmation explicite.
5. Donne une réponse concise mais expliquée, avec une trace de ce qui a été vérifié.
"""


class AnalysisAgent:
    def __init__(
        self,
        zetaris_client: ZetarisClient,
        llm_client: NemotronClient,
        max_iterations: int = 8,
        memory_store: HMemMemoryStore | None = None,
    ) -> None:
        self.zetaris = zetaris_client
        self.llm = llm_client
        self.max_iterations = max_iterations
        self.intent_engine = ScoutIntentEngine()
        self.memory = memory_store or HMemMemoryStore()

    def run(self, question: str, request_id: str | None = None) -> dict[str, Any]:
        run_id = request_id or str(uuid.uuid4())
        intent = self.intent_engine.classify(question)
        memories = self.memory.retrieve(question, run_id=run_id)
        if intent.approval_required:
            response = (
                "Cette demande est orientée action et nécessite une approbation Guardian "
                "avant toute exécution."
            )
            return {
                "response": response,
                "trace": {
                    "question": question,
                    "steps": [],
                    "sql_executions": [],
                    "final_answer": response,
                    "intent": intent.as_dict(),
                    "provider": self.llm.provider,
                    "memory": {"retrieved": [memory.as_dict() for memory in memories], "written": []},
                },
            }
        memory_context = "\n".join(f"- {memory.content}" for memory in memories)
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Relevant H-MEM context:\n{memory_context}\n\nQuestion: {question}"
                    if memory_context
                    else question
                ),
            },
        ]
        trace: dict[str, Any] = {
            "question": question,
            "steps": [],
            "sql_executions": [],
            "final_answer": "",
            "intent": intent.as_dict(),
            "provider": self.llm.provider,
            "memory": {"retrieved": [memory.as_dict() for memory in memories], "written": []},
        }

        for iteration in range(1, self.max_iterations + 1):
            trace["steps"].append({"iteration": iteration, "stage": "llm_call"})
            completion = self.llm.chat_with_tools(messages=messages, tools=TOOL_SCHEMA)
            trace["steps"][-1].update(self.llm.last_call_metadata)
            trace.setdefault("model_calls", []).append(dict(self.llm.last_call_metadata))
            message = completion.choices[0].message
            tool_calls = getattr(message, "tool_calls", None) or []

            if not tool_calls:
                content = message.content or "Aucune donnée exploitable n'a été produite par le modèle."
                trace["final_answer"] = content
                trace["steps"].append({"iteration": iteration, "stage": "final_response"})
                memory = self.memory.remember(
                    f"Analysis answer: {content}",
                    source="analysis.final_response",
                    agent_id=self.llm.provider,
                    run_id=run_id,
                    memory_type="procedural",
                )
                if memory:
                    trace["memory"]["written"].append(memory.as_dict())
                return {
                    "response": content,
                    "trace": trace,
                }

            tool_call = tool_calls[0]
            tool_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments or "{}")
            trace["steps"].append({
                "iteration": iteration,
                "stage": "tool_call",
                "tool": tool_name,
                "arguments": arguments,
            })

            if tool_name != "run_sql":
                messages.append({"role": "assistant", "content": f"Outil non pris en charge : {tool_name}."})
                continue

            sql = arguments.get("sql", "")
            limit = int(arguments.get("limit", 100))
            confirmed = bool(arguments.get("confirmed", False))
            rows = self.zetaris.run_sql(sql=sql, limit=limit, confirmed=confirmed, request_id=request_id)
            trace["sql_executions"].append(
                {
                    "iteration": iteration,
                    "sql": sql,
                    "limit": limit,
                    "confirmed": confirmed,
                    "row_count": len(rows),
                    "preview": rows[:10],
                }
            )
            memory = self.memory.remember(
                f"Zetaris returned {len(rows)} rows for SQL: {sql}",
                source="zetaris.tool_result",
                agent_id=self.llm.provider,
                run_id=run_id,
            )
            if memory:
                trace["memory"]["written"].append(memory.as_dict())

            messages.append({
                "role": "assistant",
                "content": None,
                "tool_calls": [{
                    "id": tool_call.id,
                    "type": "function",
                    "function": {
                        "name": "run_sql",
                        "arguments": json.dumps({"sql": sql, "limit": limit, "confirmed": confirmed}),
                    },
                }],
            })
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(rows, ensure_ascii=False),
            })

        final_response = "Le modèle n'a pas produit de réponse finale exploitable après plusieurs itérations."
        trace["final_answer"] = final_response
        return {"response": final_response, "trace": trace}
