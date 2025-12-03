
"use client";

import React, { createContext, useContext, useReducer, type Dispatch } from 'react';
import { createDroitsMutationCommandHandler } from '../create-mutation/handler';
import { type CreateDroitsMutationCommand } from '../create-mutation/command';
import type { DroitsMutationCreatedEvent } from '../create-mutation/event';
import { suspendPaiementsCommandHandler } from '../suspend-paiements/handler';
import { type SuspendPaiementsCommand } from '../suspend-paiements/command';
import type { PaiementsSuspendusEvent } from '../suspend-paiements/event';
import { analyzeDroitsCommandHandler } from '../analyze-droits/handler';
import { type AnalyzeDroitsCommand } from '../analyze-droits/command';
import type { DroitsAnalysesEvent } from '../analyze-droits/event';
import { validateMutationCommandHandler } from '../validate-mutation/handler';
import { type ValidateMutationCommand } from '../validate-mutation/command';
import type { MutationValidatedEvent } from '../validate-mutation/event';
import { createRessourcesMutationCommandHandler } from '../create-ressources-mutation/handler';
import { type CreateRessourcesMutationCommand } from '../create-ressources-mutation/command';
import type { RessourcesMutationCreatedEvent } from '../create-ressources-mutation/event';
import { authorizeModificationCommandHandler } from '../authorize-modification/handler';
import { type AuthorizeModificationCommand } from '../authorize-modification/command';
import type { ModificationDroitsAutoriseeEvent } from '../authorize-modification/event';

// 1. TYPES
// ===========

// Base Event Interface
export interface BaseEvent {
    id: string;
    mutationId: string;
    timestamp: string;
    type: string;
}

// Event Union
export type AppEvent = DroitsMutationCreatedEvent | PaiementsSuspendusEvent | DroitsAnalysesEvent | MutationValidatedEvent | RessourcesMutationCreatedEvent | ModificationDroitsAutoriseeEvent;

// Command Union
export type AppCommand = CreateDroitsMutationCommand | SuspendPaiementsCommand | AnalyzeDroitsCommand | ValidateMutationCommand | CreateRessourcesMutationCommand | AuthorizeModificationCommand | { type: 'REPLAY', event: AppEvent } | { type: 'REPLAY_COMPLETE' };


// Projections (Read Model)
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

export interface ValidatedPeriod {
  mutationId: string;
  dateDebut: string;
  dateFin: string;
}

export interface AppState {
  mutations: Mutation[];
  todos: Todo[];
  validatedPeriods: ValidatedPeriod[];
  eventStream: AppEvent[];
}


// 2. INITIAL STATE
// ==================
export const initialState: AppState = {
  mutations: [],
  todos: [],
  validatedPeriods: [],
  eventStream: [],
};

// 3. PROJECTION LOGIC
// ======================

function applyDroitsMutationCreated(state: AppState, event: DroitsMutationCreatedEvent): AppState {
    const newState = { ...state };

    const newMutation: Mutation = {
        id: event.mutationId,
        type: 'DROITS',
        status: 'OUVERTE',
        history: [event],
    };

    const newTodos: Todo[] = [
        {
            id: crypto.randomUUID(),
            mutationId: event.mutationId,
            description: "Suspendre les paiements",
            status: 'à faire',
        },
        {
            id: crypto.randomUUID(),
            mutationId: event.mutationId,
            description: "Autoriser la modification",
            status: 'en attente',
        },
        {
            id: crypto.randomUUID(),
            mutationId: event.mutationId,
            description: "Analyser les droits",
            status: 'en attente',
        },
         {
            id: crypto.randomUUID(),
            mutationId: event.mutationId,
            description: "Valider la mutation",
            status: 'en attente',
        },
    ];

    newState.mutations = [newMutation, ...newState.mutations.filter(m => m.id !== newMutation.id)];
    newState.todos = [...newState.todos.filter(t => t.mutationId !== newMutation.id), ...newTodos];

    return newState;
}

function applyRessourcesMutationCreated(state: AppState, event: RessourcesMutationCreatedEvent): AppState {
    const newState = { ...state };

    const newMutation: Mutation = {
        id: event.mutationId,
        type: 'RESSOURCES',
        status: 'OUVERTE',
        history: [event],
    };

    const newTodos: Todo[] = [
        {
            id: crypto.randomUUID(),
            mutationId: event.mutationId,
            description: "Suspendre les paiements",
            status: 'à faire',
        },
         {
            id: crypto.randomUUID(),
            mutationId: event.mutationId,
            description: "Valider la mutation",
            status: 'en attente',
        },
    ];

    newState.mutations = [newMutation, ...newState.mutations.filter(m => m.id !== newMutation.id)];
    newState.todos = [...newState.todos.filter(t => t.mutationId !== newMutation.id), ...newTodos];

    return newState;
}


function applyPaiementsSuspendus(state: AppState, event: PaiementsSuspendusEvent): AppState {
    const newState = { ...state };
    
    newState.mutations = newState.mutations.map(m =>
        m.id === event.mutationId ? { ...m, history: [...m.history, event], status: 'EN_COURS' as MutationStatus } : m
    );

    newState.todos = newState.todos.map(t => {
        if (t.mutationId === event.mutationId) {
            if (t.description === "Suspendre les paiements") {
                 return { ...t, status: 'fait' as TodoStatus };
            }

            // If it's a DROITS mutation, the next step is to authorize modification
            const mutation = newState.mutations.find(m => m.id === event.mutationId);
            if (mutation?.type === 'DROITS' && t.description === "Autoriser la modification") {
                return { ...t, status: 'à faire' as TodoStatus };
            }
            
            // If it's not a DROITS mutation, the next step might be to validate
            if (mutation?.type !== 'DROITS' && t.description === "Valider la mutation") {
                return { ...t, status: 'à faire' as TodoStatus };
            }
        }
        return t;
    });

    return newState;
}

function applyModificationDroitsAutorisee(state: AppState, event: ModificationDroitsAutoriseeEvent): AppState {
    const newState = { ...state };
    
    newState.mutations = newState.mutations.map(m =>
        m.id === event.mutationId ? { ...m, history: [...m.history, event] } : m
    );

    newState.todos = newState.todos.map(t => {
        if (t.mutationId === event.mutationId) {
            if (t.description === "Autoriser la modification") {
                 return { ...t, status: 'fait' as TodoStatus };
            }
             if (t.description === "Analyser les droits") {
                return { ...t, status: 'à faire' as TodoStatus };
            }
        }
        return t;
    });

    return newState;
}


function applyDroitsAnalyses(state: AppState, event: DroitsAnalysesEvent): AppState {
    const newState = { ...state };
    
    newState.mutations = newState.mutations.map(m =>
        m.id === event.mutationId ? { ...m, history: [...m.history, event] } : m
    );

    newState.todos = newState.todos.map(t => {
        if (t.mutationId === event.mutationId) {
            if (t.description === "Analyser les droits") {
                 return { ...t, status: 'fait' as TodoStatus };
            }
             if (t.description === "Valider la mutation") {
                return { ...t, status: 'à faire' as TodoStatus };
            }
        }
        return t;
    });

    return newState;
}

function applyMutationValidated(state: AppState, event: MutationValidatedEvent): AppState {
    let newState = { ...state };
    
    newState.mutations = newState.mutations.map(m =>
        m.id === event.mutationId ? { ...m, history: [...m.history, event], status: 'COMPLETEE' as MutationStatus } : m
    );

    newState.todos = newState.todos.map(t => {
        if (t.mutationId === event.mutationId && t.description === "Valider la mutation") {
            return { ...t, status: 'fait' as TodoStatus };
        }
        return t;
    });

    if (event.payload.dateDebut && event.payload.dateFin) {
        const newValidatedPeriod: ValidatedPeriod = {
            mutationId: event.mutationId,
            dateDebut: event.payload.dateDebut,
            dateFin: event.payload.dateFin,
        };
        newState.validatedPeriods = [...newState.validatedPeriods, newValidatedPeriod];
    }

    return newState;
}


// This function will rebuild the state from the event stream for the main application.
function rebuildStateFromEvents(events: AppState['eventStream']): AppState {
    let state: AppState = { ...initialState, eventStream: events };
    const sortedEvents = [...events].reverse();

    for (const event of sortedEvents) {
        state = applyEvent(state, event);
    }
    return state;
}

function applyEvent(state: AppState, event: AppEvent): AppState {
    switch (event.type) {
        case 'DROITS_MUTATION_CREATED':
            return applyDroitsMutationCreated(state, event);
        case 'RESSOURCES_MUTATION_CREATED':
            return applyRessourcesMutationCreated(state, event);
        case 'PAIEMENTS_SUSPENDUS':
            return applyPaiementsSuspendus(state, event);
        case 'MODIFICATION_DROITS_AUTORISEE':
            return applyModificationDroitsAutorisee(state, event);
        case 'DROITS_ANALYSES':
            return applyDroitsAnalyses(state, event);
        case 'MUTATION_VALIDATED':
            return applyMutationValidated(state, event);
        default:
            return state;
    }
}


// 4. AGGREGATE REDUCER (COMMAND DISPATCHER)
// ======================================

export function cqrsReducer(state: AppState, command: AppCommand): AppState {

    // For BDD tests: projection is handled separately.
    if (command.type === 'REPLAY') {
       return applyEvent(state, command.event);
    }
    if (command.type === 'REPLAY_COMPLETE') {
       // Filter out completed/rejected mutations from view
       return { ...state, mutations: state.mutations.filter(m => m.status === 'OUVERTE' || m.status === 'EN_COURS') };
    }


    let newState = state;

    // The command handlers only produce events and add them to the stream.
    // They don't contain projection logic.
    switch (command.type) {
        case 'CREATE_DROITS_MUTATION':
            newState = createDroitsMutationCommandHandler(state, command);
            break;
        case 'CREATE_RESSOURCES_MUTATION':
            newState = createRessourcesMutationCommandHandler(state, command);
            break;
        case 'SUSPEND_PAIEMENTS':
            newState = suspendPaiementsCommandHandler(state, command);
            break;
        case 'AUTHORIZE_MODIFICATION':
            newState = authorizeModificationCommandHandler(state, command);
            break;
        case 'ANALYZE_DROITS':
            newState = analyzeDroitsCommandHandler(state, command);
            break;
        case 'VALIDATE_MUTATION':
            newState = validateMutationCommandHandler(state, command);
            break;
        default:
            return state;
    }

    // After a command has potentially added a new event,
    // we rebuild the entire state from the full event stream.
    // This is the "event sourcing" part of the pattern.
    return rebuildStateFromEvents(newState.eventStream);
}


// 5. CONTEXT & PROVIDER
// =======================
const CqrsContext = createContext<{ state: AppState; dispatch: Dispatch<AppCommand> } | undefined>(undefined);

export function CqrsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cqrsReducer, initialState);

  return (
    <CqrsContext.Provider value={{ state, dispatch }}>
      {children}
    </CqrsContext.Provider>
  );
}

// 6. HOOK
// =========
export function useCqrs() {
  const context = useContext(CqrsContext);
  if (context === undefined) {
    throw new Error('useCqrs must be used within a CqrsProvider');
  }
  return context;
}
