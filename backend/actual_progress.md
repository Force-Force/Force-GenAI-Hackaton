# Actual Progress - AuraBI Backend

Date: 2026-10-23

## 1. Résumé exécutif

Le dépôt actuel est un backend FastAPI orienté ETL visuel et orchestration d’agents sur PostgreSQL. Il contient une base solide pour la gestion de workflows de données, les conversations agentives, la protection RGPD/PII et la supervision de tâches exécutées.

Le code est déjà bien structuré autour de modules de routage API, services métier, modèles SQLAlchemy, migrations Alembic et tests Pytest. Les écarts principaux par rapport au besoin “BI proactive + vues sémantiques + Zetaris + explain why” concernent surtout :

- la couche sémantique / KPI non encore formaliser,
- le routing multi-modèle Nemotron/OpenAI-compatible non finalisé,
- l’intégration Zetaris / Lightning SQL absente ou incomplète,
- l’orchestration supervisée via LangGraph ou workflow graph explicite non mise en place,
- la traçabilité complète de requête et les alertes proactives non finalisées.

---

## 2. État réel du codebase

### 2.1 Structure du projet

Le backend contient actuellement les modules suivants :

- `app/main.py` : point d’entrée FastAPI, CORS, health check, inclusion des routers.
- `app/api/v1/` : routes pour pipelines, nœuds, arêtes, chat, exécution, guardian, questions, ETL, websocket, tâches d’agent.
- `app/services/` : logique métier pour pipeline, exécution, workflow, grille de données, guardian, questions, etc.
- `app/models/` : modèles SQLAlchemy pour pipeline, exécution, tâches, nœuds, arêtes, approvals, question utilisateur.
- `app/etl/` : introspection base, SQL planner, logique ETL.
- `app/guardian/` : contrôle PII et politique de sécurité.
- `app/mcp/` : master agent, Cursor LLM et serveur MCP.
- `alembic/` : migrations versionnées.
- `tests/` : tests unitaires autour des agents, PII, génération de questions.

### 2.2 Stack technique constatée

Le dépôt utilise actuellement :

- Python 3.11+
- FastAPI
- SQLAlchemy 2 async
- Alembic
- PostgreSQL
- asyncpg
- Pydantic v2 / pydantic-settings
- httpx
- Cursor SDK
- pytest

La configuration du projet dans `app/config.py` contient déjà plusieurs variables d’environnement utiles :

- `DATABASE_URL`
- `LLM_PROVIDER`
- `CURSOR_API_KEY`, `CURSOR_MODEL`
- `GEMINI_API_KEY`, `OPENAI_API_KEY`
- `ZETARIS_*` (URL, org id, API key)
- `MODEL_BASE_URL`, `MODEL_API_KEY`, `NEMOTRON_MODEL`

Cela montre que le backend a commencé à préparer un environnement plus abstrait, mais la logique effective de production reste centrée sur Cursor / Gemini / OpenAI et non sur un router Nemotron finalisé.

---

## 3. Ce qui est déjà fonctionnel

### 3.1 Visual ETL backend

Le projet est bien avancé sur le plan backend ETL visuel :

- création / modification / suppression de pipelines,
- gestion de nœuds et d’arêtes,
- historique de chat associé à un pipeline,
- WebSocket pour synchronisation en temps réel,
- exécution de tâches d’agent et suivi d’état,
- base persistée via PostgreSQL et migrations Alembic.

### 3.2 Contrôle d’exécution et protection

Le dépôt contient déjà un socle de sécurité métier :

- `app/guardian/pii.py`
- `app/guardian/policy.py`
- `app/services/guardian_service.py`
- validation de PII et masquage,
- approbation / validation humaine de certaines actions,
- logique de verrouillage autour des requêtes et exécutions sensibles.

### 3.3 Agent conversationnel

Le code contient une base claire d’orchestration d’agent :

- `app/mcp/master_agent.py`
- `app/mcp/cursor_llm.py`
- `app/agents/question_generator.py`
- `app/services/chat_service.py`
- `app/services/user_input_service.py`

Ce niveau est utile pour l’interface “question en langage naturel → workflow → réponse”, mais il reste un orchestrateur ad hoc plutôt qu’un orchestrateur robuste de type graph state machine.

### 3.4 Introspection de sources et SQL

Le dépôt comprend déjà des modules pour :

- introspection de schéma SQL,
- génération de plans SQL,
- inspection de sources de données,
- validation de requêtes ou logique de readonly guard,
- parcours de workflows ETL.

Cela donne un socle utile pour un futur Agent Analyst et un profilage de source.

### 3.5 Tests unitaires

Les tests présents couvrent des composants importants :

- `tests/test_master_agent.py`
- `tests/test_question_generator.py`
- `tests/test_guardian_pii.py`

La présence de ces tests est un point fort, même si le benchmark TI / KPI / failover modèle et les tests de flux complet “Explain Why” restent à ajouter.

---

## 4. Progress réel par exigence backend

| Domaine | Niveau actuel | Commentaire |
|---|---|---|
| Backend ETL visuel | Très avancé | Pipeline, nœuds, arêtes, WebSocket, services bien structurés |
| PostgreSQL + Alembic | Très avancé | Base de données versionnée et orchestrée |
| Guard / PII / approval | Avancé | Base solide de sécurité et validation humaine |
| Master agent / chat | Avancé | Conversation et délégation d’agent présents |
| Introspection source / SQL planner | Avancé | Logiciel exploitable pour ETL et profiling |
| Zetaris / Lightning SQL | Très faible | Pas de workflow réel d’intégration / validation complète |
| Semantic KPI / semantic views | Faible | Absence de catalogue sémantique propre |
| LangGraph / orchestration explicite | Faible | Présence d’un runner agent, mais pas d’orchestrateur graph-based de produit |
| Agent Analyst NL → SQL | Partiel | Base de logique SQL, mais pas sur vue sémantique Zetaris finalisée |
| Explain Why | Partiel | Présence de traces et de contexte partiel, mais non homogène |
| Alertes KPI proactives | Faible | Non complètes dans le dépôt actuel |
| Viz agent | Faible | Non implémenté comme feature de backend robuste |
| Nemotron failover | Partiel | Variables présentes ; router final non validé |
| Benchmark TPCH | Faible | Non présent |
| Auth / sécurité API | Faible | MVP sans auth explicite |

---

## 5. Points forts actuels

- Architecture backend lisible, découpée par responsabilités.
- Base de données versionnée avec migrations Alembic.
- API REST et WebSocket bien positionnées pour un produit visuel.
- Écosystème de tests déjà existant.
- Blocage de logique de sensibilité / PII bien présent.
- Infrastructure de workflow ETL et de planning SQL utile pour un futur volet BI / analyse.

---

## 6. Blocages et écarts majeurs

### 6.1 Absence de couche sémantique BI

Le code actuel modélise un pipeline ETL visuel, pas un catalogue de vues sémantiques / KPI gouvernés. Le produit n’a pas encore la couche qui impose :

- vue validée,
- source de vérité,
- dimensions et métriques contrôlées,
- politique d’accès au niveau logique.

### 6.2 Intégration Zetaris non aboutie

Le dépôt contient des références à `zetaris_*` dans la configuration, mais il n’y a pas encore d’architecture de source onboarding, de validation de dry-run, ni de couche de requêtage définitive sur vues sémantiques.

### 6.3 Orchestration non finale

Le flux actuel est structurée comme un ensemble de services et d’agents, mais il manque encore :

- un orchestrateur clair,
- états explicites du workflow,
- retries / backoff,
- fallback de route de modèle,
- traçabilité unifiée demandée pour l’Explain Why.

### 6.4 Sécurité et conformité produit

Le MVP est ouvert, sans auth réelle, sans règles d’accès strictes, sans standard d’OpenAPI d’erreurs et sans audit complet des requêtes. Cela est acceptable pour un prototype, mais pas pour un produit de BI opérationnelle.

### 6.5 Routing modèles

Le projet peut pointer vers Cursor / Gemini / OpenAI, et il possède quelques variables de configuration pour `Nemotron`, mais la mise en route du routing multi-modèle, du failover et du contrat OpenAI-compatible n’est pas encore démontrée dans le code de production.

---

## 7. Évaluation globale

### Niveau réel de progression

- Backend core : 75%
- ETL visuel / workflows : 80%
- Guardian / sécurité : 70%
- Agent conversationnel : 65%
- BI sémantique / KPI : 10%
- Zetaris / Lightning SQL : 15%
- Explain Why complet : 25%
- Failover modèle / Nemotron : 20%
- Benchmark TPCH : 0%

### Conclusion

Le dépôt est déjà en bonne position pour servir de base technique d’un backend de BI agentique, mais il n’est pas encore aligné sur l’objectif “BI proactive avec vues sémantiques, orchestrateur central, requêtes autorisées, explication et sécurité de donnée”.

Le plus gros travail reste à faire sur :

1. la couche sémantique et les KPI,
2. l’intégration Zetaris / Lightning SQL,
3. l’orchestration robuste du workflow,
4. la traçabilité globale et la démonstration “Explain Why”,
5. la finalisation du routing de modèles et du failover.

---

## 8. Prochaines actions recommandées

1. Finaliser le contrat de catalogue sémantique et des KPI validés.
2. Introduire des endpoints de sources, de vues et de KPI alignés avec la logique Zetaris.
3. Ajouter un orchestrateur de workflow explicite (LangGraph ou équivalent).
4. Standardiser les traces de requêtes et les réponses d’explication.
5. Mettre en place la logique de failover multi-modèle.
6. Ajouter le benchmark TPCH et les tests d’intégration de bout en bout.

Ce document sert de point de référence actuel pour compléter les exigences backend avec l’état réel du code et orienter la suite du développement.
