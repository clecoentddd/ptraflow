
"use client";

import type { AppState } from '../mutation-lifecycle/cqrs';
import type { CreateRessourcesMutationCommand } from './command';
import type { RessourcesMutationCreatedEvent } from './event';
import { toast as realToast } from 'react-hot-toast';

type HandlerDependencies = {
  toast: { error: (message: string) => void };
}

// Command Handler
export function createRessourcesMutationCommandHandler(
  state: AppState,
  command: CreateRessourcesMutationCommand,
  dependencies: HandlerDependencies = { toast: realToast }
): AppState {
  
  const existingMutation = state.mutations.find(m => m.status === 'OUVERTE' || m.status === 'EN_COURS');
  if (existingMutation) {
    dependencies.toast.error(`La mutation ${existingMutation.id} est déjà en cours.`);
    return state;
  }
  
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
