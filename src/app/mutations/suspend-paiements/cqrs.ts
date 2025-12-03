
"use client";

import type { AppState, AppEvent, MutationStatus, TodoStatus } from '../mutation-lifecycle/cqrs';

// Command
export interface SuspendPaiementsCommand {
  type: 'SUSPEND_PAIEMENTS';
  payload: {
    mutationId: string;
  };
}

// Event
export interface PaiementsSuspendusEvent extends AppEvent {
    type: 'PAIEMENTS_SUSPENDUS';
    payload: {
        userEmail: string;
    }
}

// Projection
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

    newState.eventStream = [event, ...newState.eventStream];
    return newState;
}

// Command Handler
export function suspendPaiementsReducer(state: AppState, command: SuspendPaiementsCommand): AppState {
  const { mutationId } = command.payload;
  const mutation = state.mutations.find((m) => m.id === mutationId);
  if (!mutation || mutation.status === 'COMPLETEE') return state;

  const todo = state.todos.find(t => t.mutationId === mutationId && t.description === 'Suspendre les paiements');
  if (!todo || todo.status !== 'à faire') return state;


  const event: PaiementsSuspendusEvent = {
    id: crypto.randomUUID(),
    type: 'PAIEMENTS_SUSPENDUS',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        userEmail: 'anonymous' // In a real app, this would come from auth
    }
  };

  return applyPaiementsSuspendus(state, event);
}
