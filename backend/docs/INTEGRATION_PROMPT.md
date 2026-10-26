# Prompt d’intégration réel pour l’équipe

Copier-coller ce prompt pour démarrer l’intégration du produit en mode production.

```text
On intègre maintenant AuraBI en mode production réel.

Objectif :
- brancher le backend sur une vraie instance Zetaris
- brancher le backend sur une vraie configuration NVIDIA/Nemotron
- faire fonctionner l’application comme elle est censée l’être, sans fallback ni mock
- valider le flux complet backend + IA + données réelles

Règles strictes :
- ne pas utiliser de fallback local
- ne pas utiliser de valeurs placeholder pour les clés
- ne pas remplacer le vrai service Zetaris par un localhost factice
- ne pas présenter de capture si le service réel n’est pas vérifié
- ne pas committer les secrets
- utiliser le fichier .env uniquement pour la config réelle

Configuration attendue :
- MODEL_PROVIDER=nvidia
- NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
- NVIDIA_API_KEY=<clée réelle>
- NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
- ZETARIS_MODE=cloud ou le mode réel utilisé par l’environnement
- ZETARIS_CLOUD_URL=<URL réelle de Zetaris>
- ZETARIS_API_KEY=<clé réelle>
- ZETARIS_ORG_ID=<org id réelle>
- ZETARIS_SQL_ENDPOINT=/sql-editor/sqls/run

Checklist :
1. Remplir .env avec les vraies valeurs
2. Vérifier le backend se charge sans erreur
3. Lancer les tests Python
4. Tester `SELECT 1` sur Zetaris
5. Tester le modèle NVIDIA / Nemotron
6. Démarrer uvicorn
7. Vérifier `/health`
8. Tester le flux chatbot et la lecture de données réelle
9. Ne pas arrêter tant qu’une preuve réelle de Zetaris et de Nemotron est visible

Sortie attendue :
- backend démarré correctement
- API /health en OK
- Zetaris répond sur un vrai SQL
- Nemotron répond sur un vrai message
- le flux métier complet est validé en environnement réel

Important : cette intégration doit être faite correctement, pas en mode secours. Le produit doit fonctionner comme prévu dans un environnement réel.
```
