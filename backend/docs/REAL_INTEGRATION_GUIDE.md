# Guide d’intégration réelle Zetaris + Nemotron

Ce document remplace toute logique de secours. L’objectif est d’intégrer le système selon le mode de production attendu : vraie instance Zetaris, vraie clé Nemotron/NVIDIA, vraie configuration d’environnement, et validation fonctionnelle réelle.

## 1. Règle de base

Ne pas utiliser de fallback local, de faux endpoint, de mock, ni d’URL de secours en production. Le backend est conçu pour fonctionner avec :

- une vraie base PostgreSQL
- une vraie instance Zetaris
- un vrai modèle Nemotron/NVIDIA accessible via l’API compatible OpenAI

Les valeurs d’environnement doivent être remplies dans le fichier `.env` du backend.

---

## 2. Pré-requis

### Backend

- Python 3.11+
- environnement virtuel `.venv`
- dépendances déjà listées dans `requirements.txt`

### Services externes

- PostgreSQL démarré localement ou dans l’environnement cible
- Zetaris accessible via une URL HTTP(S)
- API Nemotron / NVIDIA opérationnelle avec clé valide

---

## 3. Fichier d’environnement attendu

Créer `.env` à partir du modèle existant et remplir les variables suivantes :

```env
DATABASE_URL=postgresql+asyncpg://datapipe:datapipe@localhost:5432/datapipe
API_HOST=0.0.0.0
API_PORT=8000

CORS_ORIGINS=http://localhost:3000,http://localhost:5173
CORS_ALLOW_ALL=false

MODEL_PROVIDER=nvidia
MODEL_BASE_URL=https://integrate.api.nvidia.com/v1
MODEL_API_KEY=your_nvidia_api_key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_API_KEY=your_nvidia_api_key
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
NEMOTRON_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b

ZETARIS_MODE=cloud
ZETARIS_CLOUD_URL=https://your-zetaris-cloud-host/api/v1.0
ZETARIS_API_URL=https://your-zetaris-api-host/api/v1.0
ZETARIS_REST_URL=http://localhost:8888/api/v1.0
ZETARIS_SQL_ENDPOINT=/sql-editor/sqls/run
ZETARIS_ORG_ID=1
ZETARIS_API_KEY=your_zetaris_api_key
```

### Règle d’activation

- Si `ZETARIS_MODE=cloud` et `ZETARIS_CLOUD_URL` est renseigné, le backend utilisera cette URL.
- Sinon, il utilisera `ZETARIS_API_URL`.
- Sinon, il utilisera `ZETARIS_REST_URL`.

Cette logique est déjà implémentée dans les settings du backend. L’intégration doit donc utiliser la vraie URL de l’environnement de production ou de validation.

---

## 4. Vérifications à faire avant lancement

### 4.1 Vérifier l’environnement Python

```bash
cd /home/yaj/Desktop/AuraBI/AuraBI_backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

### 4.2 Vérifier que le backend charge

```bash
source .venv/bin/activate
python -c "import app.main; print('OK')"
```

Résultat attendu : `OK`

### 4.3 Vérifier les tests du backend

```bash
source .venv/bin/activate
python -m pytest -q
```

Résultat attendu : tous les tests passent.

---

## 5. Vérification réelle de Zetaris

Avant toute validation UI, on doit vérifier que l’endpoint Zetaris réel répond.

### 5.1 Test minimal de connectivité

```bash
curl -sS -X POST "https://your-zetaris-cloud-host/api/v1.0/sql-editor/sqls/run" \
  -H "Authorization: Bearer your_zetaris_api_key" \
  -H "X-Org-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "queryId": "check-1",
    "sql": "SELECT 1 AS ok",
    "source": "SqlEditor",
    "limit": 10
  }'
```

On attend une réponse JSON contenant une clé `data` avec au moins une ligne.

### 5.2 Vérification côté backend

```bash
source .venv/bin/activate
python - <<'PY'
from app.analysis.data import ZetarisClient
client = ZetarisClient(
    'https://your-zetaris-cloud-host/api/v1.0',
    api_key='your_zetaris_api_key',
    org_id=1,
    sql_endpoint='/sql-editor/sqls/run',
)
rows = client.run_sql('SELECT 1 AS ok', limit=10, confirmed=True)
print(rows)
PY
```

Résultat attendu : liste de lignes renvoyées par Zetaris.

Ne pas utiliser de localhost simulé si le service réel n’est pas en place.

---

## 6. Vérification réelle de Nemotron / NVIDIA

### 6.1 Test minimal

```bash
curl -sS https://integrate.api.nvidia.com/v1/models \
  -H "Authorization: Bearer your_nvidia_api_key"
```

### 6.2 Test de génération texte

```bash
curl -sS https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_nvidia_api_key" \
  -d '{
    "model": "nvidia/nemotron-3.5-lightning-30b-a3b",
    "messages": [
      {"role": "user", "content": "Bonjour, réponds en une phrase."}
    ],
    "temperature": 0.2
  }'
```

Le backend attend un client compatible OpenAI. La configuration est déjà prévue dans la logique de settings et de `NemotronClient`.

---

## 7. Démarrer le backend réel

```bash
cd /home/yaj/Desktop/AuraBI/AuraBI_backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Vérifier la santé

```bash
curl -sS http://127.0.0.1:8000/health | jq
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

## 8. Validation des flux métier requis

### 8.1 Créer un pipeline

```bash
curl -sS -X POST http://127.0.0.1:8000/api/v1/pipelines \
  -H "Content-Type: application/json" \
  -d '{"name":"Production validation"}'
```

### 8.2 Envoyer un message au chat

```bash
curl -sS -X POST http://127.0.0.1:8000/api/v1/pipelines/<PIPELINE_ID>/chat \
  -H "Content-Type: application/json" \
  -d '{"content":"Montre-moi le pipeline ETL et dis-moi si tout est prêt."}'
```

### 8.3 Exécuter un vrai appel SQL dans le flux de données

Le backend doit appeler Zetaris uniquement pour des requêtes de lecture autorisées : `SELECT`, `SHOW`, `DESCRIBE`.

L’intégration ne doit pas exécuter de `INSERT`, `UPDATE`, `DROP`, etc. sans validation manuelle explicite.

---

## 9. Règles de sécurité et de qualité

- ne jamais exposer l’API sans réseau de confiance
- ne jamais stocker les clés dans le code source
- ne jamais committer les `.env` réels
- ne jamais faire de fallback aux URLs localhost si l’environnement réel est censé être utilisé
- ne jamais présenter un test sans service réel comme une preuve de fonctionnement Zetaris
- toujours valider l’état réel de l’endpoint avant de faire la démo

---

## 10. Prompt d’intégration à donner aux gens

Le prompt ci-dessous est le bon message à transmettre à l’équipe ou au sous-agent qui doit brancher le produit.

---

## 11. Prompt de travail pour l’intégration

```text
Intègre le backend AuraBI avec le vrai environnement production de validation.

Objectif :
- utiliser une vraie instance Zetaris disponible
- utiliser une vraie clé NVIDIA / Nemotron
- garantir que le backend fonctionne en production-like mode
- ne pas utiliser d’approche de secours, de mock, ni de fallback local
- ne pas considérer la démo comme réussie tant que les appels réels Zetaris et LLM ne sont pas validés

Contraintes :
- remplir les variables d’environnement dans .env
- ne pas coder de valeurs en dur pour les secrets
- ne pas utiliser des endpoints localhost de secours si la vraie instance est disponible
- le backend doit utiliser `MODEL_PROVIDER=nvidia`
- le backend doit utiliser `ZETARIS_MODE=cloud` ou la vraie valeur disponible pour l’instance cible
- le connecteur Zetaris doit appeler des endpoints de lecture autorisée uniquement
- le client LLM doit utiliser le modèle Nemotron NVIDIA et une clé valide

Checklist :
1. Configurer `.env` avec les vraies clés et URLs
2. Vérifier le lancement du backend : `python -c "import app.main; print('OK')"`
3. Vérifier les tests Python : `python -m pytest -q`
4. Vérifier que l’endpoint Zetaris répond à `SELECT 1`
5. Vérifier la réponse de l’API NVIDIA / Nemotron
6. Démarrer l’API : `uvicorn app.main:app --host 0.0.0.0 --port 8000`
7. Vérifier `GET /health`
8. Tester le flux de chat et les requêtes de lecture sur Zetaris
9. Ne délivrer la démo que si les appels réels sont prouvés

Ne pas simuler, ne pas court-circuiter, ne pas faire de fallback silencieux.
```

---

## 12. Conclusion

L’intégration réelle est la seule voie acceptable pour la démonstration finale. Le backend est prêt pour ce mode. La bonne pratique est de configurer les vrais endpoints, valider les réponses des services externes, puis seulement après cela faire la capture de la plateforme en marche.
