
"use client";

import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { RessourcesMutationCreatedEvent } from './event';
import { toast as realToast } from 'react-hot-toast';
import { queryValidatedPeriods } from '../projection-periodes-de-droits/projection';
import { queryMutations } from '../projection-mutations/projection';

type HandlerDependencies = {
  toast: { error: (message: string) => void };
}

// Command Handler
export function createRessourcesMutationCommandHandler(
  state: AppState,
  dispatch: (event: AppEvent) => void,
  dependencies: HandlerDependencies = { toast: realToast }
): void {
  
  const existingMutation = queryMutations(state).find(m => m.status === 'OUVERTE' || m.status === 'EN_COURS');
  if (existingMutation) {
    dependencies.toast.error(`La mutation ${existingMutation.id} est déjà en cours.`);
    return;
  }

  const validatedPeriods = queryValidatedPeriods(state);
  if (validatedPeriods.length === 0) {
    dependencies.toast.error("Il n'y a pas de périodes de droits validées.");
    return;
  }
  
  const mutationId = crypto.randomUUID();
  const event: RessourcesMutationCreatedEvent = {
    id: crypto.randomUUID(),
    type: 'RESSOURCES_MUTATION_CREATED',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: { mutationType: 'RESSOURCES' },
  };

  dispatch(event);
}

