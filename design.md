# Architecture en Slices (CQRS & Event Sourcing)

Ce document décrit l'architecture de l'application, basée sur les principes de **CQRS** (Command Query Responsibility Segregation) et d'**Event Sourcing**. Chaque fonctionnalité métier est organisée en "slice" (tranche) autonome.

## Structure d'une Slice

Chaque slice représente une capacité du système (ex: `create-mutation`, `suspend-paiements`) et est généralement organisée comme suit :

-   `command.ts`: Définit l'intention de l'utilisateur (la commande).
-   `event.ts`: Définit le ou les événements qui résultent de la commande.
-   `handler.ts`: Contient la logique métier. Il reçoit une commande, valide les règles métier et, en cas de succès, produit un ou plusieurs événements.
-   `components/`: Contient les composants React (UI) qui permettent à l'utilisateur de déclencher la commande.

## Flux de Données

Le flux est unidirectionnel et centré sur les événements :

1.  **UI / Processor** -> **Déclenche une Commande** : Un composant React ou un processus automatisé envoie une commande pour exprimer une intention (ex: `CREATE_DROITS_MUTATION`).

2.  **Command Handler** -> **Produit un Événement** : Le handler correspondant reçoit la commande. Il consulte l'état actuel (via les projections) pour valider les règles métier. S'il n'y a pas d'erreur, il crée un événement (ex: `DROITS_MUTATION_CREATED`) qui représente un fait immuable. **Le handler ne modifie jamais l'état directement.**

3.  **Event Stream** -> **Est la source de vérité** : L'événement est ajouté à un flux d'événements (`eventStream`), qui est la seule source de vérité de l'application.

4.  **Projections** -> **Construisent l'État** : Des fonctions pures, appelées **projections**, écoutent le flux d'événements. Chaque fois qu'un nouvel événement apparaît, les projections concernées l'utilisent pour construire ou mettre à jour leur "modèle de lecture" (une tranche de l'état global, ou `AppState`).

5.  **State View (UI)** -> **Affiche l'État** : Les composants React (via le hook `useCqrs()`) lisent les données depuis l'état (`AppState`) généré par les projections et les affichent. Ils ne lisent jamais les événements directement.

## Avantages

-   **Séparation des préoccupations** : La logique d'écriture (commandes) est totalement découplée de la logique de lecture (projections).
-   **Traçabilité** : L'historique complet des changements est conservé dans le `eventStream`, ce qui facilite le débogage et l'audit.
-   **Testabilité** : Chaque partie (handlers, projections) est une fonction pure, facile à tester de manière isolée.
-   **Flexibilité** : Il est facile d'ajouter de nouvelles vues (projections) sans modifier la logique métier existante.
