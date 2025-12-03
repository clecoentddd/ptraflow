
"use client";

import type { AppState } from '../mutation-lifecycle/cqrs';
import type { AuthorizeModificationCommand } from './command';
import type { ModificationAutoriseeEvent } from './event';

// Command Handler
export function authorizeModificationCommandHandler(state: AppState, command: AuthorizeModificationCommand): AppState {
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
