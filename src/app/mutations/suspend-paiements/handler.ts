
"use client";

import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { SuspendPaiementsCommand } from './command';
import type { PaiementsSuspendusEvent } from './event';
import { queryMutations } from '../projection-mutations/projection';
import { toast } from 'react-hot-toast';

// Command Handler
export function suspendPaiementsCommandHandler(
  state: AppState, 
  command: SuspendPaiementsCommand, 
  dispatch: (event: AppEvent) => void
): void {
  const { mutationId } = command.payload;

  const mutation = queryMutations(state).find(m => m.id === mutationId);
  if (!mutation) {
    toast.error("La mutation n'a pas été trouvée.");
    return;
  }
  if (mutation.status !== 'OUVERTE') {
    // This check is good to have in the handler, even if the UI prevents it.
    // It prevents dispatching an event if the state is not correct.
    toast.error("Les paiements ne peuvent être suspendus que pour une mutation ouverte.");
    return;
  }

  const event: PaiementsSuspendusEvent = {
    id: crypto.randomUUID(),
    type: 'PAIEMENTS_SUSPENDUS',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        userEmail: 'anonymous' // In a real app, this would come from auth
    }
  };

  dispatch(event);
}
