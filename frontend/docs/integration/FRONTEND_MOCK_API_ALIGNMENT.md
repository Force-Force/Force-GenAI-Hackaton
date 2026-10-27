# Alignement frontend/backend pour mock de démonstration et workflow de travail réel

## Objectif

Ce document sert à fournir une structure de réponses exacte pour le frontend, sans ambiguïté, afin de pouvoir faire une vidéo de démonstration réaliste et un workflow de travail cohérent.

Il reprend les contracts réellement exposés par le backend, y compris :

- pipeline structure
- graph nodes/edges
- execution run lifecycle
- insights payload
- UIOP operation envelope

L’objectif est d’éviter d’inventer des shapes front-only, et de garantir que les agents ou développeurs puissent reconstruire le bon comportement sans deviner.

---

## 1) Structure exacte de la réponse pipeline

### GET /pipelines/{pipeline_id}

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "name": "Customer Revenue Pipeline",
  "status": "ACTIVE",
  "architecture_design": {
    "overview": "Revenue flow from source to warehouse",
    "domain": "sales"
  },
  "updated_at": "2026-10-27T10:00:00Z",
  "nodes": [
    {
      "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "type": "SOURCE",
      "subtype": "csv",
      "label": "Orders CSV",
      "position": { "x": 80, "y": 120 },
      "data": {
        "table": "orders",
        "source": "s3://demo/orders.csv"
      },
      "status": "VALID"
    },
    {
      "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "type": "TRANSFORM",
      "subtype": "sql_query",
      "label": "Clean Revenue",
      "position": { "x": 420, "y": 120 },
      "data": {
        "sql": "SELECT * FROM raw_orders WHERE amount > 0"
      },
      "status": "PENDING"
    },
    {
      "id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "type": "SINK",
      "subtype": "postgres_sink",
      "label": "Revenue Warehouse",
      "position": { "x": 760, "y": 120 },
      "data": {
        "table": "fact_revenue"
      },
      "status": "IDLE"
    }
  ],
  "edges": [
    {
      "id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      "source": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "target": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "from_column": "customer_id",
      "to_column": "customer_key",
      "source_handle": "right-center",
      "target_handle": "left-center",
      "relationship": "foreign_key",
      "metadata": {
        "fkRefTable": "dim_customer_360"
      }
    },
    {
      "id": "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      "source": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "target": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "from_column": "net_amount",
      "to_column": "amount",
      "source_handle": "right-center",
      "target_handle": "left-center",
      "relationship": "transform",
      "metadata": {
        "mappingType": "computed"
      }
    }
  ]
}
```

### Règle de contrat

- `nodes` doit être un tableau d’objets avec `id`, `type`, `subtype`, `label`, `position`, `data`, `status`.
- `edges` doit être un tableau d’objets avec `id`, `source`, `target`, `from_column`, `to_column`, `source_handle`, `target_handle`, `relationship`, `metadata`.
- `architecture_design` peut contenir un objet JSON quelconque, tant qu’il est valide JSON.

---

## 2) Structure exacte de réponse pour un run

### POST /pipelines/{pipeline_id}/runs

```json
{
  "run": {
    "id": "44444444-4444-4444-8444-444444444444",
    "pipeline_id": "11111111-1111-4111-8111-111111111111",
    "status": "RUNNING",
    "run_number": 7,
    "duration_seconds": 137.0,
    "records_processed": 12000,
    "nodes_executed": 4,
    "total_nodes": 6,
    "current_node_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    "context": {
      "node_order": [
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
      ],
      "completed_nodes": ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      "open_questions": []
    },
    "error_message": null,
    "started_at": "2026-10-27T10:05:00Z",
    "completed_at": null,
    "created_at": "2026-10-27T10:05:00Z",
    "events": [
      {
        "id": "66666666-6666-4666-8666-666666666666",
        "run_id": "44444444-4444-4444-8444-444444444444",
        "pipeline_id": "11111111-1111-4111-8111-111111111111",
        "event_type": "RUN_STARTED",
        "message_md": "Exécution démarrée",
        "payload": {
          "nodes_count": 3
        },
        "created_at": "2026-10-27T10:05:00Z",
        "phase": "execution",
        "status": "SUCCESS",
        "duration_ms": 250
      }
    ],
    "pending_approvals": [],
    "pending_questions": []
  },
  "message": "Exécution démarrée. Approuvez les demandes Guardian puis appelez POST .../resume."
}
```

### GET /pipelines/{pipeline_id}/runs/{run_id}

Même structure que ci-dessus, sans wrapper `run` si on appelle directement la route de lecture.

---

## 3) Structure exacte des insights

### POST /pipelines/{pipeline_id}/insights/generate

```json
{
  "reply": "I queried the pipeline profile and generated the dashboard summary.",
  "summaryCards": [
    {
      "label": "Net revenue",
      "value": "$1.15M",
      "delta": "+9.1%"
    },
    {
      "label": "Enterprise retention",
      "value": "118%",
      "delta": "+4.5%"
    },
    {
      "label": "Orders processed",
      "value": "420K",
      "delta": "99.85% delivered"
    }
  ],
  "insights": [
    {
      "id": "insight-net-revenue-bridge",
      "kpiId": "net-recognized-revenue",
      "kpiName": "Net Recognized Revenue",
      "domain": "sales",
      "categoryLabel": "Revenue Decomposition",
      "title": "Gross-to-Net Revenue Bridge (Q3 Settlement)",
      "summary": "Net recognized revenue reached $1,150,000 (+9.1% QoQ), with promotional discounts (-$92K) and refunds (-$48K) within historical guardrails.",
      "aiReasoning": "Selected a Waterfall Decomposition graph because financial gross-to-net reconciliation is an additive/subtractive bridge across ledger adjustments.",
      "aiConfidenceScore": 99.4,
      "selectedGraphType": "waterfall-decomposition",
      "availableGraphOptions": [
        {
          "type": "waterfall-decomposition",
          "label": "Waterfall Bridge",
          "isAiRecommended": true,
          "reasoning": "Best for visualizing gross-to-net ledger deductions and subtotals."
        }
      ],
      "headlineMetrics": [
        {
          "label": "Gross Volume (GMV)",
          "value": "$1.34M",
          "delta": "+11.2%",
          "trend": "up"
        }
      ],
      "waterfallData": [
        {
          "id": "w1",
          "label": "Gross GMV",
          "amount": 1340000,
          "formatted": "$1.34M"
        }
      ]
    }
  ],
  "uiop": {
    "protocol": "uiop",
    "version": "1.0",
    "messageId": "msg_ins_gen_11111111-1111-4111-8111-111111111111",
    "workspaceId": "11111111-1111-4111-8111-111111111111",
    "baseRevision": 1,
    "source": {
      "agentId": "insights-agent",
      "executionId": "exec_insights"
    },
    "operations": [
      {
        "op": "insight.set_summary",
        "params": {
          "cards": [
            {
              "label": "Net revenue",
              "value": "$1.15M",
              "delta": "+9.1%"
            }
          ]
        }
      },
      {
        "op": "insight.add",
        "params": {
          "id": "insight-net-revenue-bridge",
          "title": "Gross-to-Net Revenue Bridge (Q3 Settlement)"
        }
      }
    ]
  }
}
```

### GET /pipelines/{pipeline_id}/insights

```json
{
  "summaryCards": [
    {
      "label": "Net revenue",
      "value": "$1.15M",
      "delta": "+9.1%"
    }
  ],
  "insights": [
    {
      "id": "insight-net-revenue-bridge",
      "title": "Gross-to-Net Revenue Bridge (Q3 Settlement)"
    }
  ],
  "prompt": "Pipeline overview",
  "domains": []
}
```

---

## 4) Workflow réel à suivre pour une vraie manipulation d’agents

Ce workflow est orienté “travail en situation” et permet de simuler le parcours complet sans faire des hypothèses trop fortes.

### Étape 1 — Charger le pipeline

Requête :

```http
GET /pipelines/11111111-1111-4111-8111-111111111111
```

But :
- charger la structure des nœuds et des edges
- afficher le graphe visuel
- préparer les bons identifiants pour le run

---

### Étape 2 — Démarrer une exécution

Requête :

```http
POST /pipelines/11111111-1111-4111-8111-111111111111/runs
```

But :
- créer un run actif
- récupérer `run.id`
- afficher l’état initial du workflow

---

### Étape 3 — Vérifier le run

Requête :

```http
GET /pipelines/11111111-1111-4111-8111-111111111111/runs/44444444-4444-4444-8444-444444444444
```

But :
- poller l’état de progression
- regarder `events`, `status`, `current_node_id`
- mettre à jour le front en temps réel

---

### Étape 4 — Gérer les approbations Guardian

Si le backend déclenche une approbation, alors l’agent ou l’utilisateur doit appeler :

```http
POST /pipelines/11111111-1111-4111-8111-111111111111/runs/44444444-4444-4444-8444-444444444444/resume
```

ou si besoin de réponse à question :

```http
POST /pipelines/11111111-1111-4111-8111-111111111111/runs/44444444-4444-4444-8444-444444444444/answer
```

Avec un body logique du type :

```json
{
  "question_id": "uuid-question",
  "answer": "approve"
}
```

Le backend renverra alors le `PipelineRunRead` mis à jour.

---

### Étape 5 — Générer les insights

Requête :

```http
POST /pipelines/11111111-1111-4111-8111-111111111111/insights/generate
Content-Type: application/json
```

Body :

```json
{
  "prompt": "Analysez le flux de revenus sur le pipeline",
  "domains": ["sales", "finance"]
}
```

Séquence attendue :
- le backend renvoie le `summaryCards`
- le backend renvoie la liste `insights`
- le backend renvoie le bloc `uiop`

---

### Étape 6 — Recharger les insights

Requête :

```http
GET /pipelines/11111111-1111-4111-8111-111111111111/insights
```

But :
- réafficher le dernier état persistant
- utiliser une source stable pour la demo

---

## 5) Checklist de requêtes à aligner pour un vrai workflow de travail

### A. Données du pipeline

- [ ] GET /pipelines
- [ ] GET /pipelines/{pipeline_id}
- [ ] PATCH /pipelines/{pipeline_id}

### B. Graphe et liens de dépendances

- [ ] POST /pipelines/{pipeline_id}/edges
- [ ] GET /pipelines/{pipeline_id}
- [ ] VALIDER la présence de `from_column`, `to_column`, `relationship`, `metadata`

### C. Exécution et événements

- [ ] POST /pipelines/{pipeline_id}/runs
- [ ] GET /pipelines/{pipeline_id}/runs/{run_id}
- [ ] POST /pipelines/{pipeline_id}/runs/{run_id}/resume
- [ ] POST /pipelines/{pipeline_id}/runs/{run_id}/answer
- [ ] Vérifier `status`, `events`, `current_node_id`, `pending_questions`

### D. Questions / approbations Guardian

- [ ] lire les questions pending
- [ ] répondre aux questions via `/answer`
- [ ] réactiver le run après approbation

### E. Insights et démonstration

- [ ] POST /pipelines/{pipeline_id}/insights/generate
- [ ] GET /pipelines/{pipeline_id}/insights
- [ ] afficher `summaryCards`
- [ ] afficher `insights[0].selectedGraphType`
- [ ] exploiter le bloc `uiop` si besoin pour un mode “agent action”

---

## 6) Workflow recommandé pour la démonstration vidéo

### Version courte

1. Charger le pipeline
2. Afficher le graphe
3. Démarrer un run
4. Afficher les events du run
5. Simuler une validation / approbation
6. Générer les insights
7. Afficher la carte KPI + insight détaillé
8. Recharger les insights depuis GET pour la stabilité visuelle

### Version “travail réel”

1. Créer un pipeline vide ou minimal
2. Ajouter les nœuds
3. Ajouter les edges avec metadata
4. Lancer le run
5. Surveiller les events
6. Répondre aux questions / validations
7. Reprendre l’exécution
8. Générer les insights
9. Vérifier le second état de données
10. Préparer la sortie de démonstration finale

---

## 7) Points de vigilance

- Ne pas inventer de `data` supplémentaires qui ne sont pas dans les schémas.
- Ne pas supprimer les champs optionnels qui peuvent être présents comme `null`.
- Ne pas supposer que `created_at` existe toujours dans un objet in-memory ; il doit parfois être `null` ou non défini selon le cas d’usage.
- Pour la démo, garder des IDs stables pour éviter les incohérences visuelles.

---

## 8) Recommandation finale

Pour un mock fiable de démonstration, le plus important est d’utiliser exactement cette structure :

- pipeline = `GET /pipelines/{id}`
- run = `POST /pipelines/{id}/runs` puis `GET /pipelines/{id}/runs/{run_id}`
- insights = `POST /pipelines/{id}/insights/generate` puis `GET /pipelines/{id}/insights`

Cela donne un workflow réaliste, cohérent, et immédiatement exploitable par le frontend.
