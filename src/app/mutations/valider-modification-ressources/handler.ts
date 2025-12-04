"use client";
    
import type { AppState } from '../mutation-lifecycle/domain';
import type { ValiderModificationRessourcesCommand } from './command';
import type { ModificationRessourcesValideeEvent } from './event';

// Command Handler
export function validerModificationRessourcesCommandHandler(state: AppState, command: ValiderModificationRessourcesCommand): AppState {
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

  return { ...state, eventStream: [event, ...state.eventStream] };
}
