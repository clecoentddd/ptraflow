"use client";
    
import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { ValiderModificationRessourcesCommand } from './command';
import type { ModificationRessourcesValideeEvent } from './event';
import { publishEvent } from '../mutation-lifecycle/event-bus';

// Command Handler
export function validerModificationRessourcesCommandHandler(
    state: AppState, 
    command: ValiderModificationRessourcesCommand
): void {
  const { mutationId, ressourceVersionId } = command.payload;
  
  const event: ModificationRessourcesValideeEvent = {
    id: crypto.randomUUID(),
    type: 'MODIFICATION_RESSOURCES_VALIDEE',
    mutationId,
    timestamp: new Date().toISOString(),
    ressourceVersionId,
    payload: {
        userEmail: 'anonymous',
    }
  };

  publishEvent(event);
}
