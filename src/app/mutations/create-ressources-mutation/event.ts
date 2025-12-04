import type { BaseEvent } from '../mutation-lifecycle/domain';

// Event
export interface RessourcesMutationCreatedEvent extends BaseEvent {
  type: 'RESSOURCES_MUTATION_CREATED';
  payload: {
    mutationType: 'RESSOURCES';
  };
}
