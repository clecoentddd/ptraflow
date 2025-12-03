"use client";

import type { AppState } from '../mutation-lifecycle/cqrs';
import type { ValidateMutationCommand } from './command';
import type { MutationValidatedEvent } from './event';

// Command Handler
export function validateMutationCommandHandler(state: AppState, command: ValidateMutationCommand): AppState {
  const { mutationId } = command.payload;

  const event: MutationValidatedEvent = {
    id: crypto.randomUUID(),
    type: 'MUTATION_VALIDATED',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        userEmail: 'anonymous' // In a real app, this would come from auth
    }
  };

  return { ...state, eventStream: [event, ...state.eventStream] };
}
