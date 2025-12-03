import type { BaseEvent } from '../mutation-lifecycle/cqrs';

// Event
export interface DroitsMutationCreatedEvent extends BaseEvent {
  type: 'DROITS_MUTATION_CREATED';
  payload: {
    mutationType: 'DROITS';
  };
}
