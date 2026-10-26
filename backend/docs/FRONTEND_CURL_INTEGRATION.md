# Intégration curl pour le frontend AuraBI

Ce document donne un jeu de commandes `curl` utilisables depuis le frontend ou depuis un terminal pour tester les endpoints REST du backend AuraBI.

## 1. Base URL

```bash
export BASE="http://127.0.0.1:8000"
export API="${BASE}/api/v1"
```

Pour un environnement distant : remplacer `127.0.0.1` par l’IP ou le hostname du backend, et passer en `https` / `wss` selon le déploiement.

> Le MVP ne demande pas d’authentification. Les appels JSON doivent envoyer `Content-Type: application/json`.

---

## 2. Vérification de santé

```bash
curl -s "${BASE}/health" | jq .
```

Réponse attendue :

```json
{
  "status": "ok",
  "model": "nvidia/nemotron-3.5-lightning-30b-a3b",
  "llm_configured": true,
  "provider": "nvidia"
}
```

---

## 3. Créer un pipeline

```bash
curl -s -X POST "${API}/pipelines" \
  -H "Content-Type: application/json" \
  -d '{"name":"Flux bancaire demo"}' | jq .
```

Exemple de réponse :

```json
{
  "id": "8b0e0d6d-f5dd-4d43-be57-7a5b75f70a5a",
  "name": "Flux bancaire demo",
  "status": "DRAFT",
  "architecture_design": {},
  "created_at": "2026-10-26T10:00:00Z",
  "updated_at": "2026-10-26T10:00:00Z",
  "nodes": [],
  "edges": []
}
```

Récupérer l’ID dans le shell :

```bash
export PIPELINE_ID=$(curl -s -X POST "${API}/pipelines" \
  -H "Content-Type: application/json" \
  -d '{"name":"Flux bancaire demo"}' | jq -r '.id')

echo "$PIPELINE_ID"
```

---

## 4. Lister les pipelines

```bash
curl -s "${API}/pipelines?skip=0&limit=20" | jq .
```

---

## 5. Récupérer un pipeline complet

```bash
curl -s "${API}/pipelines/${PIPELINE_ID}" | jq .
```

C’est cette route que le frontend utilisera pour reconstruire son graphe ReactFlow.

---

## 6. Mettre à jour un pipeline

```bash
curl -s -X PATCH "${API}/pipelines/${PIPELINE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Flux bancaire demo v2","status":"ACTIVE"}' | jq .
```

---

## 7. Ajouter un nœud

### Source

```bash
curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/nodes" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"SOURCE",
    "subtype":"csv",
    "label":"Transactions CSV",
    "position":{"x":0,"y":100},
    "data":{"file":"transactions_2024.csv","delimiter":";"},
    "status":"IDLE"
  }' | jq .
```

### Transformation

```bash
curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/nodes" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"TRANSFORM",
    "subtype":"python_script",
    "label":"Nettoyage montants",
    "position":{"x":300,"y":100},
    "data":{"code":"# normaliser devise, supprimer doublons"},
    "status":"IDLE"
  }' | jq .
```

### Sink

```bash
curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/nodes" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"SINK",
    "subtype":"postgres_sink",
    "label":"fact_transactions",
    "position":{"x":600,"y":100},
    "data":{"table":"fact_transactions"},
    "status":"IDLE"
  }' | jq .
```

Récupérer des IDs de nœuds :

```bash
export NODE_SOURCE=$(curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/nodes" \
  -H "Content-Type: application/json" \
  -d '{"type":"SOURCE","subtype":"csv","label":"Transactions CSV","position":{"x":0,"y":100},"data":{"file":"transactions_2024.csv"}}' \
  | jq -r '.id')

export NODE_TRANSFORM=$(curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/nodes" \
  -H "Content-Type: application/json" \
  -d '{"type":"TRANSFORM","subtype":"python_script","label":"Nettoyage montants","position":{"x":300,"y":100},"data":{"code":"# normaliser"}}' \
  | jq -r '.id')

export NODE_SINK=$(curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/nodes" \
  -H "Content-Type: application/json" \
  -d '{"type":"SINK","subtype":"postgres_sink","label":"fact_transactions","position":{"x":600,"y":100},"data":{"table":"fact_transactions"}}' \
  | jq -r '.id')

echo "source=${NODE_SOURCE} transform=${NODE_TRANSFORM} sink=${NODE_SINK}"
```

---

## 8. Ajouter des arêtes entre nœuds

```bash
curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/edges" \
  -H "Content-Type: application/json" \
  -d '{
    "source_node_id":"'"${NODE_SOURCE}"'",
    "target_node_id":"'"${NODE_TRANSFORM}"'"
  }' | jq .

curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/edges" \
  -H "Content-Type: application/json" \
  -d '{
    "source_node_id":"'"${NODE_TRANSFORM}"'",
    "target_node_id":"'"${NODE_SINK}"'"
  }' | jq .
```

Pour un backend plus simple à copier-coller dans un shell, on peut aussi faire :

```bash
curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/edges" \
  -H "Content-Type: application/json" \
  -d "{\"source_node_id\":\"${NODE_SOURCE}\",\"target_node_id\":\"${NODE_TRANSFORM}\"}" | jq .

curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/edges" \
  -H "Content-Type: application/json" \
  -d "{\"source_node_id\":\"${NODE_TRANSFORM}\",\"target_node_id\":\"${NODE_SINK}\"}" | jq .
```

---

## 9. Consulter l’historique de chat

```bash
curl -s "${API}/pipelines/${PIPELINE_ID}/chat" | jq .
```

---

## 10. Envoyer un message depuis le frontend

```bash
curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/chat" \
  -H "Content-Type: application/json" \
  -d '{"content":"Décris mon pipeline ETL et dis-moi ce qui manque pour le lancer."}' | jq .
```

Réponse type :

```json
{
  "user_message": {
    "id": "...",
    "pipeline_id": "...",
    "sender": "USER",
    "content_md": "Décris mon pipeline ETL et dis-moi ce qui manque pour le lancer.",
    "metadata": {},
    "created_at": "2026-10-26T10:00:00Z"
  },
  "agent_message": {
    "id": "...",
    "pipeline_id": "...",
    "sender": "MASTER_AGENT",
    "content_md": "Votre pipeline contient 3 nœuds ...",
    "metadata": {
      "architecture": "analysis",
      "status": "ok"
    },
    "created_at": "2026-10-26T10:00:00Z"
  },
  "agent_tasks": []
}
```

---

## 11. WebSocket

Le frontend peut écouter les événements en websocket sur :

```text
ws://127.0.0.1:8000/api/v1/ws/pipelines/{pipeline_id}
```

Événements utiles :

- `pipeline.updated`
- `node.created`
- `node.updated`
- `node.deleted`
- `edge.created`
- `edge.deleted`
- `chat.message`
- `agent_task.updated`

Exemple Python de test rapide :

```bash
python - <<'PY'
import asyncio, websockets

async def main():
    uri = "ws://127.0.0.1:8000/api/v1/ws/pipelines/00000000-0000-0000-0000-000000000000"
    async with websockets.connect(uri) as ws:
        print(await ws.recv())

asyncio.run(main())
PY
```

---

## 12. Cas utiles pour le frontend

### Créer un pipeline et le reconstruire en UI

```bash
export PIPELINE_ID=$(curl -s -X POST "${API}/pipelines" \
  -H "Content-Type: application/json" \
  -d '{"name":"Frontend demo"}' | jq -r '.id')

curl -s "${API}/pipelines/${PIPELINE_ID}" | jq .
```

### Simuler un graphe ReactFlow

```bash
curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/nodes" \
  -H "Content-Type: application/json" \
  -d '{"type":"SOURCE","subtype":"csv","label":"Input","position":{"x":0,"y":0},"data":{}}' \
  | jq .

curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/nodes" \
  -H "Content-Type: application/json" \
  -d '{"type":"TRANSFORM","subtype":"python_script","label":"Transform","position":{"x":250,"y":0},"data":{}}' \
  | jq .

curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/nodes" \
  -H "Content-Type: application/json" \
  -d '{"type":"SINK","subtype":"postgres_sink","label":"Output","position":{"x":500,"y":0},"data":{}}' \
  | jq .
```

---

## 13. Points de vigilance

- La création de nœuds et d’arêtes est l’API principale du frontend pour générer le graphe.
- Les objets de type `Node` et `Edge` doivent être reconstruit côté front dans le format ReactFlow.
- Les erreurs de validation remontent généralement sous forme `422` avec un objet `detail`.
- Les suppressions retournent `204` avec un corps vide.
- Le pipeline n’est pas un flux de données actif par défaut ; il s’agit d’un objet métier + graphe visuel, puis d’une orchestration d’IA ou d’exécution au besoin.

---

## 14. Script prêt à copier

```bash
export BASE="http://127.0.0.1:8000"
export API="${BASE}/api/v1"

export PIPELINE_ID=$(curl -s -X POST "${API}/pipelines" \
  -H "Content-Type: application/json" \
  -d '{"name":"Quick test"}' | jq -r '.id')

export NODE_A=$(curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/nodes" \
  -H "Content-Type: application/json" \
  -d '{"type":"SOURCE","subtype":"csv","label":"A","position":{"x":0,"y":0},"data":{}}' | jq -r '.id')

export NODE_B=$(curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/nodes" \
  -H "Content-Type: application/json" \
  -d '{"type":"SINK","subtype":"postgres_sink","label":"B","position":{"x":250,"y":0},"data":{"table":"demo"}}' | jq -r '.id')

curl -s -X POST "${API}/pipelines/${PIPELINE_ID}/edges" \
  -H "Content-Type: application/json" \
  -d "{\"source_node_id\":\"${NODE_A}\",\"target_node_id\":\"${NODE_B}\"}"

curl -s "${API}/pipelines/${PIPELINE_ID}" | jq .
```

Ce document est volontairement orienté “frontend-first” : la logique de création du graphe et des messages de chat est ce que le front doit reproduire directement.
