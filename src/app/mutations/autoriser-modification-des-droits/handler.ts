"use client";

import type { AppState } from '../mutation-lifecycle/domain';
import type { AutoriserModificationDroitsCommand } from './command';
import type { ModificationDroitsAutoriseeEvent } from './event';

// Command Handler
export function autoriserModificationDroitsCommandHandler(state: AppState, command: AutoriserModificationDroitsCommand): AppState {
  const { mutationId } = command.payload;
  
  const event: ModificationDroitsAutoriseeEvent = {
    id: crypto.randomUUID(),
    type: 'MODIFICATION_DROITS_AUTORISEE',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        userEmail: 'anonymous'
    }
  };

  return { ...state, eventStream: [event, ...state.eventStream] };
}
