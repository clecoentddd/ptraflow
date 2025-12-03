
"use client";

import type { AppState, Mutation, Todo } from '../mutation-lifecycle/cqrs';
import type { CreateDroitsMutationCommand } from './command';
import type { DroitsMutationCreatedEvent } from './event';

// Command Handler
export function createDroitsMutationReducer(state: AppState, command: CreateDroitsMutationCommand): AppState {
  const mutationId = crypto.randomUUID();
  const event: DroitsMutationCreatedEvent = {
    id: crypto.randomUUID(),
    type: 'DROITS_MUTATION_CREATED',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: { mutationType: 'DROITS' },
  };

  // The command handler's job is ONLY to produce an event.
  // The projection logic is handled by the aggregate reducer.
  // Here, we just add the event to the stream to be processed.
  return {
    ...state,
    eventStream: [event, ...state.eventStream]
  }
}
