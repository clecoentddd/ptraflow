"use client";

import type { AppState } from '../mutation-lifecycle/cqrs';
import type { AnalyzeDroitsCommand } from './command';
import type { DroitsAnalysesEvent } from './event';

// Command Handler
export function analyzeDroitsCommandHandler(state: AppState, command: AnalyzeDroitsCommand): AppState {
  const { mutationId } = command.payload;
  
  const event: DroitsAnalysesEvent = {
    id: crypto.randomUUID(),
    type: 'DROITS_ANALYSES',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        userEmail: 'anonymous'
    }
  };

  return { ...state, eventStream: [event, ...state.eventStream] };
}
