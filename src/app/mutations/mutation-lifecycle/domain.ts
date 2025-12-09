

import type { DroitsMutationCreatedEvent } from '../create-mutation/event';
import type { PaiementsSuspendusEvent } from '../suspend-paiements/event';
import type { DroitsAnalysesEvent } from '../analyze-droits/event';
import type { RessourcesMutationCreatedEvent } from '../create-ressources-mutation/event';
import type { ModificationDroitsAutoriseeEvent } from '../autoriser-modification-des-droits/event';
import type { ModificationRessourcesAutoriseeEvent } from '../autoriser-modification-des-ressources/event';
import type { RevenuAjouteEvent } from '../ecritures/ajouter-revenu/event';
import type { DepenseAjouteeEvent } from '../ecritures/ajouter-depense/event';
import type { ModificationRessourcesValideeEvent } from '../valider-modification-ressources/event';
import type { EcritureSupprimeeEvent } from '../ecritures/supprimer-ecriture/event';
import type { PlanCalculeEvent } from '../calculer-plan/event';
import type { EcriturePeriodeCorrigeeEvent } from '../ecritures/mettre-a-jour-ecriture/event';
import type { DecisionPreparteeEvent } from '../preparer-decision/event';
import type { DecisionValideeEvent } from '../valider-decision/event';
import type { PlanDePaiementValideEvent } from '../valider-plan-paiement/event';
import type { TransactionCreeeEvent, TransactionEffectueeEvent, TransactionRemplaceeEvent } from '../projection-transactions/events';

// Importation des commandes de mutation
import type { CreateDroitsMutationCommand } from '../create-mutation/command';
import type { SuspendPaiementsCommand } from '../suspend-paiements/command';
import type { AnalyzeDroitsCommand } from '../analyze-droits/command';
import type { CreateRessourcesMutationCommand } from '../create-ressources-mutation/command';
import type { AutoriserModificationDroitsCommand } from '../autoriser-modification-des-droits/command';
import type { AutoriserModificationRessourcesCommand } from '../autoriser-modification-des-ressources/command';
import type { AjouterRevenuCommand } from '../ecritures/ajouter-revenu/command';
import type { AjouterDepenseCommand } from '../ecritures/ajouter-depense/command';
import type { ValiderModificationRessourcesCommand } from '../valider-modification-ressources/command';
import type { SupprimerEcritureCommand } from '../ecritures/supprimer-ecriture/command';
import type { MettreAJourEcritureCommand } from '../ecritures/mettre-a-jour-ecriture/command';
import type { ValiderPlanCalculCommand } from '../calculer-plan/command';
import type { PreparerDecisionCommand } from '../preparer-decision/command';
import type { ValiderDecisionCommand } from '../valider-decision/command';
import type { ValiderPlanPaiementCommand } from '../valider-plan-paiement/command';
import type { ExecuterTransactionCommand } from '../executer-transaction/command';
import type { PreparerTransactionsCommand } from '../preparer-transactions/command';

// Importation des états de projection
import type { ValidatedPeriodsState } from '../projection-periodes-de-droits/projection';
import type { MutationsState } from '../projection-mutations/projection';
import type { TodolistState } from '../projection-todolist/projection';
import type { EcrituresState } from '../projection-ecritures/projection';
import type { PlanCalculState } from '../projection-plan-calcul/projection';
import type { PlanDePaiementState } from '../projection-plan-de-paiement/projection';
import type { DecisionAPrendreState } from '../projection-decision-a-prendre/projection';
import type { TransactionsState } from '../projection-transactions/projection';
import type { DecisionHistoryState } from '../projection-decision-history/projection';


// =================================
// 1. DÉFINITIONS DU DOMAINE (ÉVÉNEMENTS & COMMANDES)
// =================================

// Base Event Interface
export interface BaseEvent {
    id: string;
    mutationId: string;
    timestamp: string;
    type: string;
}

// Event Union (Le "registre central" des événements)
export type AppEvent = 
    | DroitsMutationCreatedEvent 
    | PaiementsSuspendusEvent 
    | DroitsAnalysesEvent 
    | PlanDePaiementValideEvent
    | RessourcesMutationCreatedEvent 
    | ModificationDroitsAutoriseeEvent
    | ModificationRessourcesAutoriseeEvent
    | RevenuAjouteEvent
    | DepenseAjouteeEvent
    | ModificationRessourcesValideeEvent
    | EcritureSupprimeeEvent
    | EcriturePeriodeCorrigeeEvent
    | PlanCalculeEvent
    | DecisionPreparteeEvent
    | DecisionValideeEvent
    | TransactionCreeeEvent
    | TransactionRemplaceeEvent
    | TransactionEffectueeEvent;


// Command Union (Le "registre central" des commandes)
export type AppCommand = 
    // Nouveau type d'action pour le pattern Pub/Sub
    | { type: 'DISPATCH_EVENT', event: AppEvent }
    | { type: 'DISPATCH_EVENTS', events: AppEvent[] }
    // Commandes
    | CreateDroitsMutationCommand 
    | SuspendPaiementsCommand 
    | AnalyzeDroitsCommand 
    | ValiderPlanPaiementCommand 
    | CreateRessourcesMutationCommand
    | AutoriserModificationDroitsCommand
    | AutoriserModificationRessourcesCommand
    | AjouterRevenuCommand
    | AjouterDepenseCommand
    | ValiderModificationRessourcesCommand
    | SupprimerEcritureCommand
    | MettreAJourEcritureCommand
    | ValiderPlanCalculCommand
    | PreparerDecisionCommand
    | ValiderDecisionCommand
    | ExecuterTransactionCommand
    | PreparerTransactionsCommand
    // Actions pour les tests
    | { type: 'REPLAY', eventStream: AppEvent[] } 
    | { type: 'REPLAY_COMPLETE' };


// =================================
// 2. MODÈLES DE LECTURE (PROJECTIONS)
// =================================

export type MutationType = 'DROITS' | 'RESSOURCES';
export type MutationStatus = 'OUVERTE' | 'EN_COURS' | 'COMPLETEE' | 'REJETEE';

export interface Mutation {
  id: string;
  type: MutationType;
  status: MutationStatus;
  history: AppEvent[];
}

export type TodoStatus = 'à faire' | 'fait' | 'en attente';

export interface Todo {
    id: string;
    mutationId: string;
    description: string;
    status: TodoStatus;
}

export type EcritureType = 'revenu' | 'dépense';

export interface Ecriture {
    id: string; // ecritureId
    mutationId: string;
    ressourceVersionId: string;
    type: EcritureType;
    code: string;
    libelle: string;
    montant: number;
    dateDebut: string; // MM-yyyy
    dateFin: string; // MM-yyyy
}


// =================================
// 3. ÉTAT GLOBAL DE L'APPLICATION (STATE)
// =================================

// L'état global est la somme de toutes les projections.
export interface AppState extends 
    ValidatedPeriodsState, 
    MutationsState, 
    TodolistState, 
    EcrituresState, 
    PlanCalculState,
    PlanDePaiementState,
    DecisionAPrendreState,
    TransactionsState,
    DecisionHistoryState
{
  eventStream: AppEvent[];
}
