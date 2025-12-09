
"use client";

import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { DroitsMutationCreatedEvent } from './event';
import { toast as realToast } from 'react-hot-toast';
import { queryMutations } from '../projection-mutations/projection';
import { publishEvent } from '../mutation-lifecycle/event-bus';

type HandlerDependencies = {
  toast: { error: (message: string) => void };
}

// Command Handler
export function createDroitsMutationCommandHandler(
  state: AppState,
  dependencies: HandlerDependencies = { toast: realToast }
): void {
  
  // La validation est ici pour garantir l'intégrité, même si l'UI fait déjà une vérification.
  const mutations = queryMutations(state);
  const existingMutation = mutations.find(m => m.status === 'OUVERTE' || m.status === 'EN_COURS');

  if (existingMutation) {
    dependencies.toast.error(`La mutation ${existingMutation.id} est déjà en cours.`);
    return; // On ne dispatche aucun événement
  }
  
  const mutationId = crypto.randomUUID();
  const event: DroitsMutationCreatedEvent = {
    id: crypto.randomUUID(),
    type: 'DROITS_MUTATION_CREATED',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: { mutationType: 'DROITS' },
  };

  // On "publie" l'événement
  publishEvent(event);
}
