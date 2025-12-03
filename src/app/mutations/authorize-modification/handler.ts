
"use client";

import type { AppState } from '../mutation-lifecycle/cqrs';
import type { AuthorizeModificationCommand } from './command';
import type { ModificationDroitsAutoriseeEvent } from './event';

// Command Handler
export function authorizeModificationCommandHandler(state: AppState, command: AuthorizeModificationCommand): AppState {
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
