"use client";
    
import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { AutoriserModificationRessourcesCommand } from './command';
import type { ModificationRessourcesAutoriseeEvent } from './event';

// Command Handler
export function autoriserModificationRessourcesCommandHandler(
    state: AppState, 
    command: AutoriserModificationRessourcesCommand,
    dispatch: (event: AppEvent) => void
): void {
  const { mutationId, ressourceVersionId } = command.payload;
  
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

  dispatch(event);
}
