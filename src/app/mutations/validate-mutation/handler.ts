"use client";

import type { AppState } from '../mutation-lifecycle/domain';
import type { ValidateMutationCommand } from './command';
import type { MutationValidatedEvent } from './event';
import type { DroitsAnalysesEvent } from '../analyze-droits/event';

// Command Handler
export function validateMutationCommandHandler(state: AppState, command: ValidateMutationCommand): AppState {
  const { mutationId } = command.payload;

  const droitsAnalysesEvent = state.eventStream
    .find(event => event.mutationId === mutationId && event.type === 'DROITS_ANALYSES') as DroitsAnalysesEvent | undefined;

  const payload: MutationValidatedEvent['payload'] = {
    userEmail: 'anonymous' // In a real app, this would come from auth
  };

  if (droitsAnalysesEvent) {
    payload.dateDebut = droitsAnalysesEvent.payload.dateDebut;
    payload.dateFin = droitsAnalysesEvent.payload.dateFin;
  }

  const event: MutationValidatedEvent = {
    id: crypto.randomUUID(),
    type: 'MUTATION_VALIDATED',
    mutationId,
    timestamp: new Date().toISOString(),
    payload,
  };

  return { ...state, eventStream: [event, ...state.eventStream] };
}
