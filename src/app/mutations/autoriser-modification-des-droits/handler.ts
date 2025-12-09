"use client";

import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { AutoriserModificationDroitsCommand } from './command';
import type { ModificationDroitsAutoriseeEvent } from './event';
import { publishEvent } from '../mutation-lifecycle/event-bus';

// Command Handler
export function autoriserModificationDroitsCommandHandler(
    state: AppState, 
    command: AutoriserModificationDroitsCommand
): void {
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

  publishEvent(event);
}
