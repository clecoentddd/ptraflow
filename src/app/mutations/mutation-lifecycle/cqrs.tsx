
"use client";

import React, { createContext, useContext, useReducer, type Dispatch } from 'react';
import { createDroitsMutationCommandHandler } from '../create-mutation/handler';
import { type CreateDroitsMutationCommand } from '../create-mutation/command';
import type { DroitsMutationCreatedEvent } from '../create-mutation/event';
import { suspendPaiementsCommandHandler } from '../suspend-paiements/handler';
import { type SuspendPaiementsCommand } from '../suspend-paiements/command';
import { type PaiementsSuspendusEvent } from '../suspend-paiements/event';
import { analyzeDroitsCommandHandler } from '../analyze-droits/handler';
import { type AnalyzeDroitsCommand } from '../analyze-droits/command';
import { type DroitsAnalysesEvent } from '../analyze-droits/event';

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
export type AppEvent = DroitsMutationCreatedEvent | PaiementsSuspendusEvent | DroitsAnalysesEvent;

// Command Union
export type AppCommand = CreateDroitsMutationCommand | SuspendPaiementsCommand | AnalyzeDroitsCommand;

// Projections (Read Model)
export type MutationType = 'DROITS';
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

export interface AppState {
  mutations: Mutation[];
  todos: Todo[];
  eventStream: AppEvent[];
}


// 2. INITIAL STATE
// ==================
const initialState: AppState = {
  mutations: [],
  todos: [],
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

    newState.mutations = [newMutation, ...newState.mutations];
    newState.todos = [...newState.todos, ...newTodos];

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


// This function will rebuild the state from the event stream.
// It's the core of the event sourcing pattern.
function rebuildStateFromEvents(events: AppState['eventStream']): AppState {
    let state: AppState = { ...initialState, eventStream: events };
    // We reverse the events to apply them in chronological order
    const sortedEvents = [...events].reverse();

    for (const event of sortedEvents) {
        switch (event.type) {
            case 'DROITS_MUTATION_CREATED':
                state = applyDroitsMutationCreated(state, event);
                break;
            case 'PAIEMENTS_SUSPENDUS':
                state = applyPaiementsSuspendus(state, event);
                break;
            case 'DROITS_ANALYSES':
                state = applyDroitsAnalyses(state, event);
                break;
        }
    }
    return state;
}


// 4. AGGREGATE REDUCER (COMMAND HANDLER)
// ======================================

function cqrsReducer(state: AppState, command: AppCommand): AppState {
    let newState = state;

    // The command handlers only produce events and add them to the stream.
    // They don't contain projection logic.
    switch (command.type) {
        case 'CREATE_DROITS_MUTATION':
            newState = createDroitsMutationCommandHandler(state, command);
            break;
        case 'SUSPEND_PAIEMENTS':
            newState = suspendPaiementsCommandHandler(state, command);
            break;
        case 'ANALYZE_DROITS':
            newState = analyzeDroitsCommandHandler(state, command);
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
