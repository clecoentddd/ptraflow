"use client";

import type { AppState, Mutation, Todo } from '../mutation-lifecycle/cqrs';
import type { CreateDroitsMutationCommand } from './command';
import type { DroitsMutationCreatedEvent } from './event';

// Command Handler
export function createDroitsMutationCommandHandler(state: AppState, command: CreateDroitsMutationCommand): AppState {
  const mutationId = crypto.randomUUID();
  const event: DroitsMutationCreatedEvent = {
    id: crypto.randomUUID(),
    type: 'DROITS_MUTATION_CREATED',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: { mutationType: 'DROITS' },
  };

  return {
    ...state,
    eventStream: [event, ...state.eventStream]
  }
}
