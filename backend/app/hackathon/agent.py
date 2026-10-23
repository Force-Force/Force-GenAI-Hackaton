import json
from typing import Any

from app.hackathon.data import ZetarisClient
from app.hackathon.power import NemotronClient
from app.hackathon.supervisor import SupervisorAgent

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


class HackathonAgent(SupervisorAgent):
    def __init__(self, zetaris_client: ZetarisClient, llm_client: NemotronClient, max_iterations: int = 8) -> None:
        super().__init__(zetaris_client=zetaris_client, llm_client=llm_client, max_iterations=max_iterations)

    def run(self, question: str) -> dict[str, Any]:
        result = super().run(question)
        return {
            "request_id": result.get("request_id"),
            "status": result.get("status", "ok"),
            "response": result["response"],
            "trace": result["trace"],
        }
