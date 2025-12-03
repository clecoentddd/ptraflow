import type { AppEvent } from '../mutation-lifecycle/cqrs';

// Event
export interface DroitsMutationCreatedEvent extends AppEvent {
  type: 'DROITS_MUTATION_CREATED';
  payload: {
    mutationType: 'DROITS';
  };
}
