
"use client";

import type { AppState, BaseEvent, TodoStatus } from '../mutation-lifecycle/cqrs';

// Command
export interface SuspendPaiementsCommand {
  type: 'SUSPEND_PAIEMENTS';
  payload: {
    mutationId: string;
  };
}

// Event
export interface PaiementsSuspendusEvent extends BaseEvent {
    type: 'PAIEMENTS_SUSPENDUS';
    payload: {
        userEmail: string;
    }
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

  return { ...state, eventStream: [event, ...state.eventStream] };
}
