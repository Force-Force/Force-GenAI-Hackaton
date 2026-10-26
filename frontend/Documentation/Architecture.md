je participe a un hackathon sponsorise par cursor qui commence demain et on a deja une idee de projet. je veux que tu m'aide a faire un MVP.

  

je veux donc qu'en tant qu'expert en developpement logiciel et data scientist tu m'aide a evaluer le projet et produire un MVP evolutif. Le hackathon se passe demain et voici le theme de notre projet

  

Thème : DataPipe - ETL Visuel pour Pipelines Bancaires

  

○​ Concept: Une interface web nodale (visuelle) permettant de concevoir des flux

  

d'ingestion de données (fichiers CSV, JSON, bases SQL) et d'appliquer des

  

transformations à la volée.

  

○​ Opportunité Bonus IA: Un assistant capable de générer le code de transformation

  

de données complexe (requête SQL ou script de nettoyage) à partir d'une

  

description textuelle de l'utilisateur.

  

  

voici ce sur quoi nous sommes alles:

  

  

 C'est un Swarm ETL (Essaim d'Agents Multi-IA) intégré directement dans l'IDE via le protocole MCP. L'intelligence du système ne repose pas sur une accumulation de règles métiers rigides (if/else), mais sur un talent pur de déduction et une architecture conçue pour garantir une absence constante d'erreurs face à l'imprévu.

  

  

2. L'Escouade d'Agents (Fonctionnalités Retenues)

  

L'Agent maitre: Il gere le workflow des sous agents, delegue les taches, interagis avec l'utilisateurs (Chatbot), pose des questions a l'utilisateurs si necessaire par rapport a la methode d'implementation de la tache a effectuer ou les choix de meilleurs methodes d'implementation architectural, demande d'upload de fichiers de donnees si ce n'est pas fait, ou methode d'authentification au base de donnees en ligne si necessaire, etc

  

L'Agent Profileur (Déduction "À l'Aveugle", Data manager) : Il audite les données entrantes sans aucun étiquetage préalable de ce qui est "normal" ou "anormal". Cette absence d'étiquettes rend l'épreuve de détection plus difficile, mais permet de repérer des fraudes ou des anomalies purement logiques (Zero-Shot Detection) que des règles statiques auraient ignorées. Il est capable de manipuler des donnees au format JSON, sqlite, postgres..., online database, des datawarehouse et des datamarts.

  

L'Agent Ingénieur & L'agent Débogueur (Self-Healing) : L'Ingénieur écrit le code de transformation (Pandas/SQL). S'il échoue, le système ne s'arrête pas. L'erreur est interceptée et renvoyée au Débogueur interne qui corrige le tir à la milliseconde, assurant une résilience totale du pipeline.

  

Le Gardien (Human-in-the-Loop & PII) : Il masque les données sensibles (RGPD) et intercepte les opérations critiques (ex: suppression massive de colonnes ou export final) pour exiger une approbation humaine explicite.

  

L'Agent de test: Permet de faire des operation OLAP sur les donnees(Slice, Dice, ...)

  

L'Agent Auditeur (Rapport LaTeX) : À la fin du flux, il compile l'historique complet des actions, les statistiques de conformité et génère dynamiquement un rapport d'audit officiel au format PDF via LaTeX.

  

comme architecture de modele, on a prevu ceci

Ces entités servent à représenter graphiquement le pipeline à l'écran et sont synchronisées en temps réel avec le frontend (ReactFlow/VueFlow).

- Les Entités de l'Interface Visuelle (Le Graphe Nodal)

1. Node (Le Nœud)

À quoi il sert : Représente un bloc élémentaire du pipeline sur l'interface graphique.Informations clés : Identifiant, type (SOURCE, TRANSFORM, SINK), sous-type (ex: csv, python_script), coordonnées X/Y pour la grille, données internes (code généré, schémas) et statut actuel (IDLE, PENDING, VALID, ERROR).

2. Edge (La Liaison)

À quoi il sert : Représente le câble visuel reliant deux nœuds et symbolise le déplacement du flux de données.Informations clés : Identifiant de la liaison, identifiant du nœud de départ (source_node_id) et identifiant du nœud d'arrivée (target_node_id).

- Les Entités de l'Architecture de Données (Le Décisionnel)

Ces entités servent de guide technique aux agents de l'IA pour structurer les tables finales dans le Data Warehouse bancaire selon les meilleures pratiques.

1. ArchitectureDesign (Le Design de la Cible)

À quoi il sert : Définit le type d'organisation des données choisi pour la base de données de destination.Informations clés : Lien avec le pipeline, type de modèle (STAR, SNOWFLAKE, OLAP_CUBE, FLAT), liste des tables cibles, type de gestion de l'historique bancaire (SCD) et justification textuelle du choix par l'IA.

2. TargetTableDefinition (La Définition de Table)

À quoi il sert : Décrit précisément la structure d'une table finale à créer dans la base de données.Informations clés : Nom de la table (ex: fact_transactions), rôle décisionnel (FACT ou DIMENSION), dictionnaire des colonnes avec leurs types, clé primaire et clés étrangères.

- Les Entités de l'Orchestration Multi-Agents (La Plomberie IA)Ces entités servent à suivre l'activité des agents en arrière-plan, à mémoriser les discussions et à faire fonctionner la boucle de correction automatique du code.

1. ChatMessage (Le Message de Chat)

À quoi il sert : Stocke l'historique de la discussion textuelle entre l'utilisateur et l'Agent Maître.Informations clés : Expéditeur (USER ou MASTER_AGENT), contenu du texte au format Markdown et horodatage.

2. AgentTask (La Tâche d'Agent)À quoi il sert : Permet à l'Agent Maître de déléguer un ordre précis à un agent FastMCP spécialisé et de suivre son exécution.Informations clés : Lien avec le pipeline, agent ciblé (ANALYST, ENGINEER, QA, REPORTER), instruction textuelle de l'ordre, données d'entrée, données de sortie retournées par l'agent et statut de la tâche (PENDING, RUNNING, COMPLETED, FAILED).

3. DebugSession (La Session de Débogage)

À quoi il sert : Gère l'historique de la boucle de correction de code entre l'agent Testeur et l'agent Débogueur.

Informations clés : Lien avec la tâche et le nœud concernés, compteur de tentatives, version du code testée, historique des erreurs ou logs d'exécution capturés et indicateur de résolution (True/False).

- Le Conteneur Global (Le Projet)

Pipeline (Le Projet Complet)

À quoi il sert : C'est l'enveloppe globale qui contient l'intégralité du projet ETL. C'est cet objet unique qui est sauvegardé en base de données et envoyé au Frontend.Informations clés : Identifiant et nom du projet, liste de tous les nœuds, liste de toutes les liaisons, plan de l'architecture cible, statut général et date de mise à jour.


roadmap development


la définition des contrats (prompts et outils) de l'Agent Maître
le serveur MCP pour la communication avec l'IDE,
la structure de la base de données backend gérant vos entité


