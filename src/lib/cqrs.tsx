
"use client";

import React, { createContext, useContext, useReducer, type Dispatch } from 'react';

// 1. TYPES
// ===========
export type MutationType = 'DROITS';
export type MutationStatus = 'OUVERTE' | 'EN_COURS' | 'COMPLETEE' | 'REJETEE';
export type TodoStatus = 'à faire' | 'fait';

// Events
interface BaseEvent {
  id: string;
  type: string;
  mutationId: string;
  timestamp: string;
}

export interface DroitsMutationCreatedEvent extends BaseEvent {
  type: 'DROITS_MUTATION_CREATED';
  payload: {
    mutationType: 'DROITS';
  };
}

export interface PaiementsSuspendusEvent extends BaseEvent {
    type: 'PAIEMENTS_SUSPENDUS';
    payload: {
        userEmail: string;
    }
}


export type AppEvent =
  | DroitsMutationCreatedEvent
  | PaiementsSuspendusEvent;

// Commands
interface BaseCommand {
  type: string;
}

export interface CreateDroitsMutationCommand extends BaseCommand {
  type: 'CREATE_DROITS_MUTATION';
}

export interface SuspendPaiementsCommand extends BaseCommand {
  type: 'SUSPEND_PAIEMENTS';
  payload: {
    mutationId: string;
  };
}

export type AppCommand = CreateDroitsMutationCommand | SuspendPaiementsCommand;

// Projections (Read Model)
export interface Mutation {
  id: string;
  type: MutationType;
  status: MutationStatus;
  history: AppEvent[];
}

export interface Todo {
    id: string;
    mutationId: string;
    description: string;
    status: TodoStatus;
    // We could add more specific todos based on events
    isPaiementsSuspendus: boolean;
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

// 3. REDUCER (COMMAND HANDLER + PROJECTION)
// ===========================================
function applyEvents(state: AppState, events: AppEvent[]): AppState {
    return events.reduce((newState, event) => {
        newState.eventStream = [event, ...newState.eventStream];

        switch(event.type) {
            case 'DROITS_MUTATION_CREATED': {
                const newMutation: Mutation = {
                    id: event.mutationId,
                    type: 'DROITS',
                    status: 'OUVERTE',
                    history: [event],
                };
                 const newTodo: Todo = {
                    id: crypto.randomUUID(),
                    mutationId: event.mutationId,
                    description: "Paiements à suspendre",
                    status: 'à faire',
                    isPaiementsSuspendus: false,
                };
                newState.mutations = [newMutation, ...newState.mutations];
                newState.todos = [newTodo, ...newState.todos];
                break;
            }
            case 'PAIEMENTS_SUSPENDUS': {
                 newState.mutations = newState.mutations.map(m =>
                    m.id === event.mutationId ? { ...m, history: [...m.history, event], status: 'COMPLETEE' as MutationStatus } : m
                );
                newState.todos = newState.todos.map(t =>
                    t.mutationId === event.mutationId
                    ? { ...t, status: 'fait' as TodoStatus, isPaiementsSuspendus: true }
                    : t
                );
                break;
            }
        }
        return newState;
    }, { ...state });
}


function cqrsReducer(state: AppState, command: AppCommand): AppState {
  switch (command.type) {
    case 'CREATE_DROITS_MUTATION': {
      const mutationId = crypto.randomUUID();
      const event: DroitsMutationCreatedEvent = {
        id: crypto.randomUUID(),
        type: 'DROITS_MUTATION_CREATED',
        mutationId,
        timestamp: new Date().toISOString(),
        payload: { mutationType: 'DROITS' },
      };

      return applyEvents(state, [event]);
    }

    case 'SUSPEND_PAIEMENTS': {
      const { mutationId } = command.payload;
      const mutation = state.mutations.find((m) => m.id === mutationId);
      if (!mutation || mutation.status === 'COMPLETEE') return state;

      const event: PaiementsSuspendusEvent = {
        id: crypto.randomUUID(),
        type: 'PAIEMENTS_SUSPENDUS',
        mutationId,
        timestamp: new Date().toISOString(),
        payload: {
            userEmail: 'anonymous' // In a real app, this would come from auth
        }
      };

      return applyEvents(state, [event]);
    }

    default:
      return state;
  }
}

// 4. CONTEXT & PROVIDER
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

// 5. HOOK
// =========
export function useCqrs() {
  const context = useContext(CqrsContext);
  if (context === undefined) {
    throw new Error('useCqrs must be used within a CqrsProvider');
  }
  return context;
}
