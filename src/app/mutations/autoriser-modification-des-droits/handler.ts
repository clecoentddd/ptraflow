"use client";

import type { AppState } from '../mutation-lifecycle/cqrs';
import type { AutoriserModificationDroitsCommand } from './command';
import type { ModificationAutoriseeEvent } from './event';

// Command Handler
export function autoriserModificationDroitsCommandHandler(state: AppState, command: AutoriserModificationDroitsCommand): AppState {
  const { mutationId } = command.payload;
  
  const event: ModificationAutoriseeEvent = {
    id: crypto.randomUUID(),
    type: 'MODIFICATION_AUTORISEE',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        userEmail: 'anonymous'
    }
  };

  return { ...state, eventStream: [event, ...state.eventStream] };
}

    