
import type { DroitsMutationCreatedEvent } from '../create-mutation/event';
import type { PaiementsSuspendusEvent } from '../suspend-paiements/event';
import type { DroitsAnalysesEvent } from '../analyze-droits/event';
import type { MutationValidatedEvent } from '../validate-mutation/event';
import type { RessourcesMutationCreatedEvent } from '../create-ressources-mutation/event';
import type { ModificationDroitsAutoriseeEvent } from '../autoriser-modification-des-droits/event';
import type { ModificationRessourcesAutoriseeEvent } from '../autoriser-modification-des-ressources/event';
import type { RevenuAjouteEvent } from '../ecritures/ajouter-revenu/event';
import type { DepenseAjouteeEvent } from '../ecritures/ajouter-depense/event';
import type { ModificationRessourcesValideeEvent } from '../valider-modification-ressources/event';
import type { EcritureSupprimeeEvent } from '../ecritures/supprimer-ecriture/event';


import type { CreateDroitsMutationCommand } from '../create-mutation/command';
import type { SuspendPaiementsCommand } from '../suspend-paiements/command';
import type { AnalyzeDroitsCommand } from '../analyze-droits/command';
import type { ValidateMutationCommand } from '../validate-mutation/command';
import type { CreateRessourcesMutationCommand } from '../create-ressources-mutation/command';
import type { AutoriserModificationDroitsCommand } from '../autoriser-modification-des-droits/command';
import type { AutoriserModificationRessourcesCommand } from '../autoriser-modification-des-ressources/command';
import type { AjouterRevenuCommand } from '../ecritures/ajouter-revenu/command';
import type { AjouterDepenseCommand } from '../ecritures/ajouter-depense/command';
import type { ValiderModificationRessourcesCommand } from '../valider-modification-ressources/command';
import type { SupprimerEcritureCommand } from '../ecritures/supprimer-ecriture/command';
import type { MettreAJourEcritureCommand } from '../ecritures/mettre-a-jour-ecriture/command';

import type { ValidatedPeriodsState } from '../projection-periodes-de-droits/projection';
import type { MutationsState } from '../projection-mutations/projection';
import type { TodolistState } from '../projection-todolist/projection';
import type { EcrituresState } from '../projection-ecritures/projection';
import type { JournalState } from '../projection-journal/projection';

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
    | MutationValidatedEvent 
    | RessourcesMutationCreatedEvent 
    | ModificationDroitsAutoriseeEvent
    | ModificationRessourcesAutoriseeEvent
    | RevenuAjouteEvent
    | DepenseAjouteeEvent
    | ModificationRessourcesValideeEvent
    | EcritureSupprimeeEvent;

// Command Union (Le "registre central" des commandes)
export type AppCommand = 
    | CreateDroitsMutationCommand 
    | SuspendPaiementsCommand 
    | AnalyzeDroitsCommand 
    | ValidateMutationCommand 
    | CreateRessourcesMutationCommand
    | AutoriserModificationDroitsCommand
    | AutoriserModificationRessourcesCommand
    | AjouterRevenuCommand
    | AjouterDepenseCommand
    | ValiderModificationRessourcesCommand
    | SupprimerEcritureCommand
    | MettreAJourEcritureCommand
    | { type: 'REPLAY', event: AppEvent } 
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
export interface AppState extends ValidatedPeriodsState, MutationsState, TodolistState, EcrituresState, JournalState {
  eventStream: AppEvent[];
}
