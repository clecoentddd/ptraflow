
"use client";
    
import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { AutoriserModificationRessourcesCommand } from './command';
import type { ModificationRessourcesAutoriseeEvent } from './event';
import { publishEvent } from '../mutation-lifecycle/event-bus';

// Command Handler
export function autoriserModificationRessourcesCommandHandler(
    state: AppState, 
    command: AutoriserModificationRessourcesCommand
): void {
  const { mutationId } = command.payload;
  
  // The handler is now responsible for generating the ID.
  const ressourceVersionId = crypto.randomUUID();

  const event: ModificationRessourcesAutoriseeEvent = {
    id: crypto.randomUUID(),
    type: 'MODIFICATION_RESSOURCES_AUTORISEE',
    mutationId,
    timestamp: new Date().toISOString(),
    ressourceVersionId,
    payload: {
        userEmail: 'anonymous',
    }
  };

  publishEvent(event);
}
