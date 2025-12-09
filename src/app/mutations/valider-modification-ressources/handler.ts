
"use client";
    
import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { ValiderModificationRessourcesCommand } from './command';
import type { ModificationRessourcesValideeEvent } from './event';
import { publishEvent } from '../mutation-lifecycle/event-bus';
import type { ModificationRessourcesAutoriseeEvent } from '../autoriser-modification-des-ressources/event';
import { toast } from 'react-hot-toast';

// Command Handler
export function validerModificationRessourcesCommandHandler(
    state: AppState, 
    command: ValiderModificationRessourcesCommand
): void {
  const { mutationId } = command.payload;

  // The handler is now responsible for finding the correct ressourceVersionId.
  const authEvent = [...state.eventStream].reverse().find(
      e => e.mutationId === mutationId && e.type === 'MODIFICATION_RESSOURCES_AUTORISEE'
  ) as ModificationRessourcesAutoriseeEvent | undefined;

  if (!authEvent) {
      toast.error("Contexte d'autorisation de modification non trouvé.");
      return;
  }
  
  const event: ModificationRessourcesValideeEvent = {
    id: crypto.randomUUID(),
    type: 'MODIFICATION_RESSOURCES_VALIDEE',
    mutationId,
    timestamp: new Date().toISOString(),
    ressourceVersionId: authEvent.ressourceVersionId,
    payload: {
        userEmail: 'anonymous',
    }
  };

  publishEvent(event);
}
