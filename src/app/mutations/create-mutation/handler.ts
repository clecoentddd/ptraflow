
"use client";

import type { AppState } from '../mutation-lifecycle/cqrs';
import type { CreateDroitsMutationCommand } from './command';
import type { DroitsMutationCreatedEvent } from './event';
import { toast } from 'react-hot-toast';

// Command Handler
export function createDroitsMutationCommandHandler(state: AppState, command: CreateDroitsMutationCommand): AppState {
  
  const existingMutation = state.mutations.find(m => m.status === 'OUVERTE' || m.status === 'EN_COURS');
  if (existingMutation) {
    toast.error(`La mutation ${existingMutation.id} est déjà en cours.`);
    return state;
  }
  
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
