
"use client";

import type { AppState } from '../mutation-lifecycle/domain';
import type { CreateDroitsMutationCommand } from './command';
import type { DroitsMutationCreatedEvent } from './event';
import { toast as realToast } from 'react-hot-toast';

type HandlerDependencies = {
  toast: { error: (message: string) => void };
}

// Command Handler
export function createDroitsMutationCommandHandler(
  state: AppState,
  command: CreateDroitsMutationCommand,
  dependencies: HandlerDependencies = { toast: realToast }
): AppState {
  
  // La validation a été déplacée côté UI. 
  // Le handler se contente maintenant de créer l'événement.
  
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
