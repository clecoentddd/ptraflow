
"use client";

import type { AppState } from '../mutation-lifecycle/cqrs';
import type { CreateRessourcesMutationCommand } from './command';
import type { RessourcesMutationCreatedEvent } from './event';

// Command Handler
export function createRessourcesMutationCommandHandler(state: AppState, command: CreateRessourcesMutationCommand): AppState {
  const mutationId = crypto.randomUUID();
  const event: RessourcesMutationCreatedEvent = {
    id: crypto.randomUUID(),
    type: 'RESSOURCES_MUTATION_CREATED',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: { mutationType: 'RESSOURCES' },
  };

  return {
    ...state,
    eventStream: [event, ...state.eventStream]
  }
}
