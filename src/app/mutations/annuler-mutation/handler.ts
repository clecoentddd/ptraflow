"use client";

import type { AppState } from '../mutation-lifecycle/domain';
import type { AnnulerMutationCommand } from './command';
import type { MutationAnnuleeEvent } from './event';
import { toast } from 'react-hot-toast';
import { queryMutations } from '../projection-mutations/projection';
import { publishEvent } from '../mutation-lifecycle/event-bus';

// Command Handler
export function annulerMutationCommandHandler(
    state: AppState, 
    command: AnnulerMutationCommand
): void {
  const { mutationId } = command.payload;
  
  const mutation = queryMutations(state).find(m => m.id === mutationId);
  if (!mutation) {
      toast.error("La mutation à annuler n'existe pas.");
      return;
  }

  // Business Rule: Cannot cancel a completed or already cancelled mutation
  if (mutation.status === 'COMPLETEE') {
      toast.error("Impossible d'annuler une mutation qui est déjà complétée.");
      return;
  }
   if (mutation.status === 'ANNULEE') {
      toast.error("Cette mutation a déjà été annulée.");
      return;
  }

  const event: MutationAnnuleeEvent = {
    id: crypto.randomUUID(),
    type: 'MUTATION_ANNULEE',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        userEmail: 'anonymous', // placeholder
        reason: 'Action manuelle de l\'utilisateur'
    }
  };

  publishEvent(event);
  toast.success(`La mutation ${mutationId.substring(0,8)}... a été annulée.`);
}
