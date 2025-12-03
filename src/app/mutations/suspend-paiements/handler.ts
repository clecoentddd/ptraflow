
"use client";

import type { AppState } from '../mutation-lifecycle/cqrs';
import type { SuspendPaiementsCommand } from './command';
import type { PaiementsSuspendusEvent } from './event';

// Command Handler
export function suspendPaiementsCommandHandler(state: AppState, command: SuspendPaiementsCommand): AppState {
  const { mutationId } = command.payload;

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
