# BACKEND_REQUIREMENTS — AuraBI hackathon 2026

## Non-conformités à corriger

- FAIT : le backend actuel est orienté ETL visuel PostgreSQL et n’a pas d’intégration Zetaris ; la couche données se fait directement via `asyncpg` et `SQLAlchemy` dans `app/etl/db_introspection.py`, `app/db/session.py`, `app/services/etl_workflow_service.py` et `app/api/v1/etl.py`.
- FAIT : le moteur LLM supporté par le code est limité à `cursor`, `gemini` et `openai` dans `app/config.py` et `app/mcp/master_agent.py`; `MODEL_BASE_URL`, `MODEL_API_KEY` et `NEMOTRON_MODEL` sont NON TROUVÉ.
- FAIT : l’architecture de routes et de services est centrée sur un workflow ETL visuel et des nœuds source/sink, pas sur des vues sémantiques Zetaris ni sur un super-agent de BI proactive ; voir `app/main.py`, `app/api/v1/pipelines.py`, `app/api/v1/chat.py`, `app/api/v1/execution.py`.
- FAIT : le dépôt ne contient pas de dépendance ni d’implémentation `langgraph`/`LangGraph` ; recherche globale sur `langgraph|LangGraph|Zetaris|zetaris|Nemotron|nemotron|MODEL_BASE_URL|MODEL_API_KEY|NEMOTRON_MODEL` → NON TROUVÉ.
- FAIT : la configuration de secret est stockée dans `.env` avec `SettingsConfigDict(env_file=".env")` dans `app/config.py`, et `.gitignore` masque `.env` ; la politique de sécurité n’empêche pas cependant l’exposition de secrets dans le code et les logs si une clé est ajoutée par erreur.
- HYPOTHÈSE : le conteneur `ai-datasteward` n’est pas présent dans le dépôt Docker actuel. Les fichiers `docker-compose.yml` et `Dockerfile` ne mentionnent pas cette image ; il faut le confirmer en environnement hackathon.

---

## 1. Résumé exécutif

- Le dépôt actuel est un backend FastAPI de conception ETL visuel sur PostgreSQL, avec orchestration d’agents et garde-fou RGPD, mais sans couche de données Zetaris ni modèle Nemotron.
- Les points forts sont la structure API/service/model, les migrations Alembic, les tests Pytest et la logique de profilage/garde-fou déjà présente.
- Le cœur du changement attendu est la refonte vers une architecture BI proactive avec vue sémantique, orchestration LangGraph, source onboarding via Zetaris, analyst SQL sur vues sécurisées et traçabilité d’explication.

---

## 2. État actuel du codebase

### 2.1 Architecture constatée

- Framework principal : FastAPI, SQLAlchemy 2 async, Alembic, PostgreSQL, Pydantic 2 ; voir `pyproject.toml`, `requirements.txt`, `app/main.py`, `app/db/session.py`, `app/config.py`.
- Point d’entrée HTTP : `app/main.py` expose le router FastAPI, CORS, health check `/health` et plusieurs sous-routers v1 (`app/api/v1/...`).
- API principale : `app/api/v1/pipelines.py`, `app/api/v1/nodes.py`, `app/api/v1/edges.py`, `app/api/v1/chat.py`, `app/api/v1/execution.py`, `app/api/v1/guardian.py`, `app/api/v1/questions.py`, `app/api/v1/etl.py`, `app/api/v1/ws.py`.
- Base de données : PostgreSQL locale via `docker-compose.yml` et `DATABASE_URL` dans `app/config.py`; migrations Alembic dans `alembic/versions/001_initial_schema.py`, `002_guardian_execution.py`, `003_user_questions.py`.
- Modèles de données : `app/models/pipeline.py`, `app/models/node.py`, `app/models/agent_task.py`, `app/models/guardian_approval.py`, `app/models/user_question.py`, `app/models/pipeline_run.py`, `app/models/enums.py`.
- Sensibilité / RGPD : `app/guardian/pii.py`, `app/guardian/policy.py` et `app/services/guardian_service.py` vérifient PII, masquage, approbation humaine.
- Agent Maître : `app/mcp/master_agent.py` et `app/mcp/cursor_llm.py` avec appels Cursor/Gemini/OpenAI; `app/agents/question_generator.py` produit des questions contextuelles; `app/etl/sql_planner.py` planifie le SQL ETL sur la source.
- Sources de données : `app/services/data_source_service.py` et `app/etl/db_introspection.py` connectent directement sur PostgreSQL via `asyncpg` et profilent des tables / vues.
- Contrôle de flux d’exécution : `app/services/execution_service.py`, `app/services/workflow_context.py`, `app/services/user_input_service.py`, `app/websocket/manager.py`.
- Tests : `tests/test_master_agent.py`, `tests/test_question_generator.py`, `tests/test_guardian_pii.py`.
- Documentation fonctionnelle existante : `docs/API_ROUTES.md`, `docs/GUARDIAN_EXECUTION.md`, `docs/WORKFLOW_ETL_REAL.md`, `docs/CONTEXTUAL_QUESTIONS.md`.

### 2.2 Stack et dépendances constatées

- Fait : `pyproject.toml` et `requirements.txt` exposent FastAPI, SQLAlchemy async, Alembic, asyncpg, pydantic-settings, httpx, cursor-sdk.
- Fait : `docker-compose.yml` lance uniquement PostgreSQL + l’API FastAPI sur `localhost:5432` / `localhost:8000`, sans service Zetaris ni service inferencing Nemotron.
- Fait : `app/config.py` fixe `llm_provider` à `cursor` par défaut, avec `cursor_api_key`, `gemini_api_key`, `openai_api_key`, `openai_model`, `gemini_model`.
- Fait : `README.md` décrit un MCP IDE optionnel et une configuration LLM `cursor` / `gemini` / `openai` ; pas de directive Nemotron.
- NON TROUVÉ : tout élément Zetaris, Lightning SQL, `X-Org-ID`, `X-Request-ID`, `NEMOTRON_MODEL`, `MODEL_BASE_URL`, `MODEL_API_KEY`, `LangGraph`, `ai-datasteward`, `CREATE LIGHTNING REST TABLE`, `CREATE SCHEMASTORE VIEW`.

### 2.3 Points forts

- Fait : la séparation entre `api`, `services`, `models`, `schemas`, `etl`, `guardian`, `websocket` est claire et lisible.
- Fait : les migrations Alembic donnent une base de données versionnée et reproductible.
- Fait : les services d’approbation / questions contextuelles / PII forment un mécanisme d’ “exécution contrôlée” exploitable pour la sécurisation de l’agent.
- Fait : la couche `guardian` et les tests PII sont une bonne base pour le track “Explain Why” et le contrôle humain.

### 2.4 Dette technique

- Fait : aucun mécanisme d’authentification, de rôles ou de permission n’est présent dans l’API, bien que `docs/API_ROUTES.md` mentionne explicitement “Aucune auth” en MVP ; voir `app/api/deps.py`, `app/main.py`, `README.md`.
- Fait : l’accès aux données métier est direct vers PostgreSQL et non via un moteur centralisé de données ; voir `app/etl/db_introspection.py` et `app/services/data_source_service.py`.
- Fait : il n’existe pas de schéma de vues sémantiques ou de catalogue de KPI avant exécution ; l’état du code est orienté pipeline ETL, pas BI sémantique.
- Fait : les appels LLM sont couplés à `Cursor`, `Gemini` et `OpenAI`, sans router multi-tenant ni failover basé sur quota / débit.
- Fait : il n’y a pas de traçabilité de requêtes SQL / source / tokens / latence à l’échelle du produit; le design est orienté conversation et pipeline, mais pas “Explain Why” as a first-class feature.
- Fait : l’orchestration actuelle est ad hoc dans le `MasterAgentRunner` et le `chat_service`, sans moteur de workflow explicite `LangGraph`.

---

## 3. Analyse d’écart

| Capacité requise | Existant | Écart | Effort (S/M/L) |
|---|---|---|---|
| Couche sémantique / KPI gouvernés par Zetaris | NON TROUVÉ ; code actuel basé sur `Pipeline` / `Node` / `architecture_design` dans `app/models/pipeline.py` et `app/services/pipeline_service.py` | Le code ne modélise ni KPI ni vues sémantiques Zetaris | L |
| Source onboarding via Zetaris + statements Lightning SQL | NON TROUVÉ ; introspection PostgreSQL directe dans `app/etl/db_introspection.py` | Il faut remplacer le “source database connect” par un workflow de registration via Zetaris | L |
| Agent Profiler sans exécution destructive | FAIT : `app/guardian` + `assert_readonly_sql` dans `app/etl/db_introspection.py` ; `plan_etl_sql` est readonly | Il faut faire du profiler “proposal-only” avec validation humaine et schéma de permission explicite | M |
| Agent Analyst NL → SQL → exécution → auto-correction | FAIT partiel : `app/etl/sql_planner.py` et `app/services/etl_workflow_service.py` | Absence de dialecte Lightning SQL, de correction d’erreurs sur `Zetaris`, et de traçabilité SQL complète | L |
| Agent Viz | NON TROUVÉ ; le code ne contient aucun module de visualisation backend | Le backend a besoin de génération de specs visuelles et de sélection de type de graphique | M |
| Superviseur orchestration central (LangGraph recommandé) | FAIT partiel : `MasterAgentRunner` dans `app/mcp/master_agent.py` ; mais pas d’orchestrateur explicite | Il faut un orchestrateur durable avec graph, routing, retry, state machine | L |
| Proactivité / alertes KPI | NON TROUVÉ ; code de chat / run / approvals mais pas de monitor planifié | Il faut scheduler + règles alertes + explication causale | L |
| Traçabilité “Explain Why” | PARTIEL : `app/services/etl_workflow_service.py` conserve `summary_md` mais pas de métadonnées complètes | Il faut SQL / sources / modèle / latence / tokens / étapes dans un contexte unifié | M |
| Routage Nemotron + failover Meterless/NVIDIA | NON TROUVÉ | Il faut un adapter `OpenAI-compatible` et un failover multi-route | M |
| Évaluation benchmark TPCH | NON TROUVÉ ; `tests/` est orienté unitaire | Il faut jeu de questions + benchmark précis / latence / coût | M |
| Authentification / sécurité API | NON TROUVÉ ; voir `docs/API_ROUTES.md` | Il faut secrets, RBAC, mTLS ou au moins API key tenant-scoped selon architecture hackathon | M |
| Déploiement local Docker + Zetaris | PARTIEL : `docker-compose.yml` couvre PostgreSQL + API; no Zetaris | Il faut ajouter le service local Zetaris et documenter les ports exposés | M |

---

## 4. Exigences fonctionnelles backend

### BE-F-01 — Couche sémantique et catalogue de KPI
- Priorité : MUST
- Description : Le backend doit exposer un catalogue de vues sémantiques (KPI) et les considérer comme la seule source de vérité pour les requêtes de l’agent Analyst.
- Critères d’acceptation :
  1. Une vue sémantique est déclarée avec identifiant, source, métrique, dimensions, validité et propriétaire.
  2. L’agent Analyst ne peut exécuter que des requêtes sur ces vues, pas sur des tables brutes.
  3. Le backend retourne un message explicite si la requête ne porte pas sur une vue validée.
  4. Le journal d’exécution conserve le nom de la vue et la source sous-jacente.
- Dépendances : BE-F-04, BE-F-06, BE-F-07.

### BE-F-02 — Source onboarding via Zetaris
- Priorité : MUST
- Description : Un agent d’onboarding de sources inspecte une source externe ou S3/Stockage accessible, propose un schéma d’enregistrement, puis exécute un dry-run de statement Lightning SQL avant validation humaine.
- Critères d’acceptation :
  1. Le système accepte une source avec type, emplacement, format, schéma et niveau de confiance.
  2. La proposition d’enregistrement a un dry-run, un diff SQL et un risque d’impact.
  3. L’exécution réelle des `CREATE LIGHTNING REST TABLE` / `CREATE SCHEMASTORE VIEW` est bloquée sans approbation humaine.
  4. Une source non accessible ou non valide retourne un message concret avec cause racine.
- Dépendances : BE-F-01, BE-F-03, BE-F-06.

### BE-F-03 — Agent Profiler de qualité et anomalies
- Priorité : MUST
- Description : Le backend doit proposer les anomalies détectées (valeurs manquantes, incohérences de types, outliers) et les nécessaires corrections de qualité, sans modifier les données sans validation.
- Critères d’acceptation :
  1. Le profiler retourne un rapport structuré : anomalies, colonnes impactées, gravité, source, preuve.
  2. Les recommandations sont émises comme propositions, jamais comme exécution immédiate.
  3. Le backend bloque toute action de correction de données sans approbation humaine.
  4. Le rapport expose les colonnes concernées, les valeurs exemples et le score de confiance.
- Dépendances : BE-F-02, BE-F-05, BE-F-06.

### BE-F-04 — Query Analyst NL vers SQL Lightning
- Priorité : MUST
- Description : Un agent Analyst transforme une question en langage naturel en requête Lightning SQL ciblée sur une vue sémantique validée et exécute la requête via Zetaris.
- Critères d’acceptation :
  1. La requête finale est unique, lisible et validée contre une vue autorisée.
  2. L’exécution est faite via `POST /sql-editor/sqls/run` avec les bons en-têtes.
  3. L’erreur SQL renvoie un message technique exploitable et déclenche une boucle de correction.
  4. Le système renvoie le SQL exécuté, la vue cible et le résultat final.
- Dépendances : BE-F-01, BE-F-05, BE-F-09.

### BE-F-05 — Explication de réponse “Explain Why”
- Priorité : MUST
- Description : Toute réponse renvoie la provenance des données, le SQL exécuté, les sources, le modèle utilisé, la latence et les tokens, avec le chemin de raisonnement.
- Critères d’acceptation :
  1. Chaque réponse contient `sql`, `sources`, `views_used`, `model`, `latency_ms`, `tokens_in/out`, `steps`.
  2. Le client peut demander l’explication détaillée pour n’importe quel résultat.
  3. Le backend conserve un journal par requête avec identifiant `X-Request-ID` et contexte d’exécution.
- Dépendances : BE-F-04, BE-F-06, BE-F-08.

### BE-F-06 — Superviseur d’orchestration
- Priorité : MUST
- Description : Un superviseur central coordonne tâches Analyst, Profiler, Viz, Guardian, qualité et alertes. LangGraph est recommandé ; la justification est que le backend a déjà des agents spécialisés et des états de workflow.
- Critères d’acceptation :
  1. Le workflow couvre au minimum les états: `INIT`, `SOURCE_VALIDATION`, `PROFILE`, `QUERY`, `RESULT`, `ALERT`.
  2. Les tâches sont routées vers un agent selon rôle et type de demande.
  3. Le supervisor gère retry, backoff et failover sur erreur modèle / API.
- Dépendances : BE-F-02, BE-F-03, BE-F-04, BE-F-07.

### BE-F-07 — Mode proactif et alertes KPI
- Priorité : SHOULD
- Description : Le produit doit surveiller des KPI et produire des alertes avec explication causale lorsqu’un seuil est franchi.
- Critères d’acceptation :
  1. Un seuil de KPI est déclaré et associé à un plan d’alerte.
  2. Un job planifié exécute la requête de surveillance et produit un verdict : normal / warning / critical.
  3. L’alerte inclut une explication de cause, une vue concernée et un historique récent.
- Dépendances : BE-F-01, BE-F-04, BE-F-05.

### BE-F-08 — Agent Viz
- Priorité : SHOULD
- Description : L’agent Viz sélectionne un type de graphique et prépare des spécifications de rendu pour la réponse visuelle.
- Critères d’acceptation :
  1. Le backend retourne un type de graphique, un dataset simplifié et les paramètres de rendu.
  2. Le système évite les graphiques non adaptés aux distributions ou aux dimensions.
  3. Le type de graphique est explicite et traçable.
- Dépendances : BE-F-04, BE-F-05.

### BE-F-09 — Routage des modèles Nemotron et failover
- Priorité : MUST
- Description : Le backend doit router les appels LLM vers Nemotron via les routes compatibles OpenAI, avec fallback automatique vers l’option de secours si débit ou limite atteint.
- Critères d’acceptation :
  1. Les variables de configuration sont seulement `MODEL_BASE_URL`, `MODEL_API_KEY`, `NEMOTRON_MODEL`.
  2. Aucune autre clé LLM ne peut démarrer le produit.
  3. Le système exécute le failover sur une route différente sans perte d’API contract.
- Dépendances : BE-F-06.

### BE-F-10 — Évaluation benchmark TPCH
- Priorité : SHOULD
- Description : Un jeu de questions de référence sur les données TPCH mesure précision, coût et latence par modèle.
- Critères d’acceptation :
  1. Le benchmark fournit au moins 20 questions de référence.
  2. Chaque exécution est datée et mesure latence, coût estimé et qualité.
  3. Les résultats sont regroupés par modèle et route.
- Dépendances : BE-F-04, BE-F-09.

### BE-F-11 — Démo minimale “Explain Why”
- Priorité : MUST
- Description : Le hackathon doit démontrer un scénario de bout en bout sur TPCH : question en NL, requête SQL sur vue, réponse chiffrée, explication causale, trace de sources et modèle.
- Critères d’acceptation :
  1. La question part de l’utilisateur ; l’agent renvoie une réponse finale avec l’explication en moins d’une minute sur données de démo.
  2. La réponse contient le SQL et la provenance de la donnée.
  3. Le workflow reste stable même si la première réponse LLM échoue ou rate un quota.
- Dépendances : BE-F-01, BE-F-04, BE-F-05, BE-F-09.

---

## 5. Exigences non fonctionnelles

### 5.1 Performance et latence
- DÉCISION RECOMMANDÉE : le temps cible pour une requête d’Analyse “Explain Why” en demo doit être inférieur à 60 secondes sur TPCH, de préférence sous 15 secondes pour les KPI simples.
- FAIT : l’API actuelle est légère, mais les appels LLM et les connectivités DB le long de la chaîne peuvent facilement dépasser cette cible sans cache / plan de requêtes / vues sémantiques.
- Exigence clé : les KPI surveillés doivent être pré-agrégés ou matérialisés via la couche Zetaris, pas recalculés intégralement sur chaque appel.

### 5.2 Fiabilité / résilience
- Exigence : API et route de modèle doivent avoir retry + backoff sur 429, 500, timeout, network issue.
- Exigence : un échec de modèle doit déclencher un rebond sur la route de sauvegarde sans casser la session utilisateur.
- Exigence : toute requête SQL non conforme à la politique de lecture seule doit être rejetée avant exécution.
- FAIT : `assert_readonly_sql` dans `app/etl/db_introspection.py` est déjà une base de garde-fou utile et doit être conservée pour la route Zetaris.

### 5.3 Sécurité
- DÉCISION RECOMMANDÉE : les secrets ne doivent être présents qu’au niveau `.env`, jamais dans le code, logs, tests ni ce document ; le dépôt actuel applique `.env` dans `.gitignore` (`.gitignore`), ce qui est conforme à cette règle.
- Exigence : aucun endpoint ne doit accepter des instructions SQL destructrices ; le backend doit n’autoriser que `SELECT` ou `CREATE VIEW` / `CREATE TABLE` au niveau de la gestion des données si l’approval est validé.
- Exigence : les outils exposés aux agents doivent être listés et sécurisés, avec policies d’allowlist sur les opérations destructrices.
- Exigence : le backend doit éviter de transmettre les secrets de route / API dans les messages d’erreur ; les logs doivent masquer les valeurs sensibles.

### 5.4 Observabilité
- Exigence : tracer pour chaque requête: `request_id`, `user`, `pipeline`, `source`, `view`, `sql`, `model`, `latency_ms`, `tokens`, `status`, `error`.
- L’implémentation actuelle ne contient pas cette structure globale; il faut l’ajouter au niveau middleware et au niveau orchestrateur.
- Exigence : conserver les messages de l’agent, les tâches, les approbations et les alertes sur un support persistant (PostgreSQL ou table d’événements) pour expliquer les décisions.

### 5.5 Testabilité
- FAIT : le dépôt possède des tests Pytest structurés autour de `MasterAgentRunner`, `question_generator` et `guardian` ; voir `tests/`.
- Exigence : ajouter des tests de contrat sur les endpoints, du mode failover des modèles, des cas de sécurité SQL, du benchmark TPCH et du workflow complet “Explain Why”.

---

## 6. Contrats d’interface

### 6.1 Endpoints AuraBI à créer ou modifier

| Méthode | Chemin | Objet | Entrée JSON (ids / schéma) | Sortie JSON (exemple) |
|---|---|---|---|---|
| POST | `/api/v1/sources/onboard` | Onboarding source | `{source_type, location, format, schema_hint, dry_run}` | `{source_id, proposed_sql, validation_status}` |
| POST | `/api/v1/semantic-kpis` | Enregistrer KPI | `{name, sql_view, description, dimensions}` | `{kpi_id, status}` |
| GET | `/api/v1/semantic-kpis` | Lister KPI | aucun | `{items:[...]}` |
| POST | `/api/v1/agent/analyst/query` | Question NL → SQL | `{question, view_scope, context}` | `{answer, sql, explain, trace}` |
| POST | `/api/v1/agent/profiler/run` | Profilage | `{source_id, analysis_scope}` | `{report_id, anomalies, recommendations}` |
| POST | `/api/v1/agent/viz/spec` | Choix visuel | `{metric, dimensions, chart_hints}` | `{chart_type, x_axis, y_axis, dataset}` |
| POST | `/api/v1/alerts/subscribe` | Watch KPI | `{kpi_id, rule, threshold}` | `{alert_id, active}` |
| GET | `/api/v1/trace/{request_id}` | Traçabilité | `{request_id}` | `{sql, steps, model, latency_ms, tokens}` |

### 6.2 Outils exposés aux agents

| Outil | Arguments | Effet |
|---|---|---|
| `zetaris_query_sql` | `{sql, request_id, org_id}` | Exécute une seule instruction SQL sur Zetaris avec en-têtes requis |
| `zetaris_list_views` | `{pattern}` | Liste les vues sémantiques accessibles |
| `register_lightning_source` | `{source_name, source_location, source_type}` | Propose puis valide l’enregistrement d’une source |
| `run_profiler` | `{source_id}` | Produit un rapport d’anomalies sans application de corrections |
| `generate_viz_spec` | `{result_rows, question}` | Choisit un graphique adapté |
| `create_kpi_alert` | `{kpi_id, threshold, comparison}` | Active une alerte proactive |
| `get_trace` | `{request_id}` | Récupère la trace complète d’exécution |

### 6.3 Règles de contrat
- Les réponses API doivent être JSON schema strictes ; aucun “payload libre” en markdown.
- Les erreurs doivent être structurées en `code`, `message`, `retryable`, `trace_id`.
- L’ID de requête doit être propagé de bout en bout.

---

## 7. Intégration Zetaris

### 7.1 Fait / Hypothèse / Décision recommandée
- FAIT : le dépôt n’a aucune intégration Zetaris ; la recherche globale sur `Zetaris|zetaris|Lightning SQL|X-Org-ID|X-Request-ID` est NON TROUVÉ.
- HYPOTHÈSE : le conteneur `ai-datasteward` peut servir d’orchestration de catalogue / schéma / vue, mais son utilisation n’est ni confirmée ni documentée dans le dépôt.
- DÉCISION RECOMMANDÉE : le backend doit traiter Zetaris comme le seul moteur de données réel pour les requêtes analytiques applicatives. Toutes les requêtes d’agent Analyst doivent passer par Zetaris, pas via PostgreSQL local.

### 7.2 Contrat d’accès requis
- Base URL REST : `http://localhost:8888/api/v1.0`
- Endpoint SQL : `POST /sql-editor/sqls/run`
- En-têtes obligatoires : `Authorization: Bearer <clé>`, `X-Org-ID`, `X-Request-ID` (UUID neuf par requête)
- JDBC : port `10000`
- Port `8889` interdit par les contraintes hackathon
- Règle : une seule instruction SQL par appel
- Dialecte : `Lightning SQL` (`CREATE LIGHTNING REST TABLE`, `CREATE SCHEMASTORE VIEW`, etc.)

### 7.3 Gestion d’erreurs
- Le backend doit différencier : erreur d’authentification, erreur de syntaxe, limite de débit, timeout, erreur de permission, vue inconnue.
- Les erreurs de syntaxe doivent déclencher une correction SQL automatique sur base de l’exception et du contexte de vue.
- Le backend doit plafonner les retries et enregistrer le dernier SQL tenté.

### 7.4 Structure des vues sémantiques
- Chaque vue KPI ou domaine doit être enregistrée avec : `name`, `purpose`, `source_table`, `dimensions`, `measures`, `owner`, `validity`, `refresh_policy`.
- Le backend doit refuser toute requête sur une vue non validée ou non autorisée.
- Les colonnes sensibles doivent être opaquees en sortie standard ; l’agent de sécurité doit déterminer l’exposition.

---

## 8. Intégration Nemotron

### 8.1 Fait / Décision recommandée
- FAIT : le dépôt actuel supporte uniquement `cursor`, `gemini` et `openai` selon `app/config.py` et les appels HTTP dans `app/mcp/master_agent.py`, `app/etl/sql_planner.py`, `app/agents/question_generator.py`.
- DÉCISION RECOMMANDÉE : le backend hackathon doit utiliser exclusivement la configuration `MODEL_BASE_URL`, `MODEL_API_KEY`, `NEMOTRON_MODEL` et aucun autre LLM pour faire tourner le produit.
- DÉCISION RECOMMANDÉE : l’appel au modèle doit rester compatible OpenAI (chat/completions ou réponse JSON structuré) afin de faciliter le passage entre route Meterless et route NVIDIA.

### 8.2 Stratégie de routage et failover
- Route primaire : Meterless si disponible.
- Route secondaire : API NVIDIA gratuite si débit ou quota sur Meterless.
- La sélection doit être logique et stateless, basée sur code de retour 429 / 5xx / timeout / quota réseau.
- Le routage ne doit pas exposer les détails d’authentification ni de fournisseur au client final.

### 8.3 Risques sur le tool calling
- Risque : certains LLM ne supportent pas bien les appels d’outils ou les JSON stricts ; il faut user a policy de validation à la sortie.
- Risque : le modèle peut émettre un SQL non compatible Lightning SQL ou une vue non autorisée.
- Mitigation : forcer un schéma JSON strict, valider le SQL avant exécution, appliquer un contrôle de refus sur toute instruction de type `DROP`, `DELETE`, `UPDATE`, `ALTER` hors workflow autorisé.

---

## 9. Modèle de données et configuration

### 9.1 Modèle de données actuel (constaté)
- `pipelines` : `app/models/pipeline.py`
- `nodes` : `app/models/node.py`
- `edges` : `app/models/edge.py`
- `chat_messages` : `app/models/chat_message.py`
- `agent_tasks` : `app/models/agent_task.py`
- `guardian_approvals` : `app/models/guardian_approval.py`
- `pipeline_runs` : `app/models/pipeline_run.py`
- `pipeline_run_events` : `app/models/pipeline_run_event.py`
- `user_questions` : `app/models/user_question.py`
- `enums` : `app/models/enums.py`
- Alembic migrations : `alembic/versions/001_initial_schema.py`, `002_guardian_execution.py`, `003_user_questions.py`

### 9.2 Modèle de données cible (recommandé)
- `semantic_views` : vue, propriétaire, source système, validité, schéma.
- `kpi_definitions` : nom, description, définition SQL, threshold, alert owners.
- `source_registrations` : source, type, store, registration status, dry-run SQL, approval state.
- `data_profiles` : source_id, row_count, columns, anomalies, score_quality.
- `analyst_queries` : question, sql_generated, view_used, status, trace_id.
- `model_runs` : provider, route, model_name, tokens_in, tokens_out, latency_ms, status.
- `alerts` : kpi_id, rule_id, severity, status, explanation.

### 9.3 Variables d’environnement (noms uniquement, sans valeurs)
- `DATABASE_URL`
- `API_HOST`
- `API_PORT`
- `CORS_ORIGINS`
- `CORS_ALLOW_ALL`
- `LLM_PROVIDER`
- `CURSOR_API_KEY`
- `CURSOR_MODEL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `MODEL_BASE_URL`
- `MODEL_API_KEY`
- `NEMOTRON_MODEL`
- `ZETARIS_API_URL`
- `ZETARIS_API_KEY`
- `ZETARIS_ORG_ID`
- `ZETARIS_REQUEST_ID_HEADER`
- `ZETARIS_SQL_ENDPOINT`

### 9.4 Gestion des secrets
- FAIT : `.gitignore` contient `.env` ; `app/config.py` utilise `SettingsConfigDict(env_file=".env")`.
- DÉCISION RECOMMANDÉE : garder les secrets uniquement dans `.env` et ne jamais les imprimer dans les logs ni dans ce document.
- RISQUE : le dépôt extérieur à la racine actuelle contient déjà un `.env` avec des clés ; il faut s’assurer qu’aucune valeur n’est intégrée dans les messages, traces ou tests.

---

## 10. Stratégie de test et d’évaluation

### 10.1 Tests automatisés actuels
- FAIT : `tests/test_master_agent.py`, `tests/test_question_generator.py`, `tests/test_guardian_pii.py` couvrent la logique de délégation, les questions contextuelles et le masque PII.
- FAIT : le backend est entièrement Python et prêt à pytest, selon `pyproject.toml`.

### 10.2 Tests à ajouter
- Test d’intégration Zetaris : validation de headers, validation de requête unique SQL, gestion d’erreur 401/429/500.
- Test de failover modèle : route Meterless puis route NVIDIA ; vérification de la compatibilité OpenAI.
- Test de sécurité SQL : rejet de `DELETE`, `DROP`, `ALTER`, `UPDATE` sans validation.
- Test de réponse “Explain Why” : présence de `sql`, `sources`, `latency_ms`, `tokens`, `model`, `steps`.
- Test de benchmark TPCH : précision / latence / coût, avec questions réelles de référence.

### 10.3 Évaluation benchmark TPCH
- Exigence : construit un set de questions sur le jeu TPCH fourni au hackathon ; chaque exécution compare : exactitude, coût, latence, stabilité.
- Recommandation : faire un benchmark sur au moins 3 routes de modèles (`Nemotron Super`, `Nemotron Nano`, `Nemotron Ultra`) et une route fallback.
- Sortie attendue : tableau agrégé par modèle et route.

---

## 11. Risques et hypothèses

| Type | Éléments | Risque / impact | Mitigation |
|---|---|---|---|
| FAIT | L’API actuelle est publique et sans auth | Risque de fuite de données, de mauvaise validation | Ajouter auth / scopes / tenant check dans la couche HTTP |
| FAIT | Accès direct `asyncpg` vers PostgreSQL | Risque de contournement de la couche sémantique | Forcer les requêtes via Zetaris + vues validées |
| FAIT | Appels LLM à des fournisseurs non conformes | Risque de non-conformité hackathon | Supprimer `cursor/gemini/openai` du path de production |
| FAIT | Aucune orchestration LangGraph | Risque d’état partagé incohérent | Introduire un orchestrateur avec state machine |
| HYPOTHÈSE | `ai-datasteward` peut compléter la gestion de vue et schéma | Risque d’intégration incorrecte si absent | Confirmer son existence et rôle lors du setup hackathon |
| HYPOTHÈSE | La route NVIDIA gratuite est stable sous charge | Risque de quota / temps de réponse | Mettre failover plus rapide vers route Meterless |
| HYPOTHÈSE | Les données TPCH sont accessibles via Zetaris sans export local | Risque de non-compatibilité du stockage | Vérifier les sources accessibles via S3 / storage externe |

---

## 12. Plan de construction ordonné

### Lot 1 — Préparation de l’architecture hackathon (priorité absolue)
- Mettre en place la configuration des variables `MODEL_BASE_URL`, `MODEL_API_KEY`, `NEMOTRON_MODEL` et le client OpenAI-compatible.
- Ajouter le client Zetaris REST et le client SQL `POST /sql-editor/sqls/run` avec en-têtes corrects.
- Introduire le `request_id` et la trace globale par requête.

### Lot 2 — Sécurité et gouvernance des données
- Définir la liste autorisée des vues / KPI.
- Rendre les flux SQL en lecture seule et les points d’écriture soumis à approbation.
- Sécuriser l’API (auth + tenant + secret policy).

### Lot 3 — Source onboarding et semantic layer
- Implémenter l’agent de registration source via Zetaris.
- Autoriser uniquement les vues validées dans la couche Agent Analyst.
- Exécuter le dry-run des statements Lightning SQL avant validation humaine.

### Lot 4 — Analyst + Explain Why
- Implémenter le routeur NL → SQL → exécution.
- Activer la boucle d’auto-correction SQL et la collecte de l’explication.
- Associer les sources, la vue, le modèle, la latence et les tokens à la réponse.

### Lot 5 — Profiler + Viz + alerting
- Profiler les anomalies sans application sans validation.
- Générer la spec visuelle à partir du résultat.
- Définir les alertes KPI et le mode proactif.

### Lot 6 — Benchmark et démonstration
- Ajouter le benchmark TPCH, le jeu de questions de référence et la comparaison de modèles.
- Préparer le scénario minimal de démo “Explain Why”.

### Scénario de démo minimal (bout en bout)
1. Un KPI ou une vue sémantique est validé dans Zetaris.
2. Une question utilisateur est posée en français sur le dataset TPCH.
3. L’Agent Analyst transforme la demande en SQL Lightning sur la vue autorisée.
4. Zetaris exécute la requête unique et renvoie le résultat.
5. Le back-end produit une réponse structurée avec SQL, source, modèle, latence, tokens et cause.
6. Un fallback vers la route alternative est déclenché si le modèle rate un quota.
7. La démonstration montre un “Why” clair : “KPI X est bas parce que Y, avec Z comme source et SQL W.”

---

## 13. Questions ouvertes

- Quelle est la version exacte du service Zetaris local (Docker compose / image / environnement) fournie pour le hackathon ?
- Le service `ai-datasteward` est-il présent ou documenté dans l’environnement de démo ?
- Les données TPCH sont-elles déjà exposées dans Zetaris ou faut-il les importer/manifester via une source S3 / storage externe ?
- Le produit doit-il être entièrement “single-tenant” pour le hackathon ou est-ce qu’il faut prévoir un multi-tenant minimal ?
- Quel est le modèle exact Nemotron à utiliser (Super / Nano / Ultra) pour la démo ?
- A-t-on un contrat de failover précis entre route Meterless et route NVIDIA gratuite ?
- Quelles questions de benchmark TPCH sont considérées comme “référence” par l’équipe ?
- Existe-t-il un besoin d’authentification côté backend au-delà des secrets `.env` pour la démo ?
- Faut-il conserver la couche PostgreSQL actuelle pour les métadonnées du produit et les tables de workflow ?
- Le hackathon impose-t-il une limite de confidentialité stricte sur les logs de modèles / traces SQL ?

---

## 14. Conclusion

Le dépôt actuel est une bonne base pour un backend ETL visuel avec orchestration d’agents et garde-fous RGPD, mais il n’est ni conforme au cahier de charge hackathon ni prêt pour une BI proactive couplée à Zetaris et Nemotron. Le point critique est la refonte du modèle de données, de la source de vérité, du mode d’orchestration et de la traçabilité d’explication, en gardant la force de l’existant : les services, les schémas, les migrations, les approbations humaines et la couverture test unitaire.
