"use client";
    
import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { ValiderPlanCalculCommand } from './command';
import type { PlanCalculeEvent } from './event';
import { toast } from 'react-hot-toast';
import { queryMutations } from '../projection-mutations/projection';
import { publishEvent } from '../mutation-lifecycle/event-bus';

// Command Handler
export function validerPlanCalculCommandHandler(
    state: AppState, 
    command: ValiderPlanCalculCommand
): void {
  const { mutationId, ressourceVersionId, calculId, resultatDuCalcul } = command.payload;
  
  // Business Rule: The mutation must be in progress.
  const mutation = queryMutations(state).find(m => m.id === mutationId && m.status === 'EN_COURS');
  if (!mutation) {
      toast.error("La mutation n'est pas en cours ou n'existe pas.");
      return;
  }
  
  const event: PlanCalculeEvent = {
    id: crypto.randomUUID(),
    type: 'PLAN_CALCUL_EFFECTUE',
    mutationId,
    timestamp: new Date().toISOString(),
    ressourceVersionId,
    payload: {
        calculId,
        detail: resultatDuCalcul,
    }
  };

  publishEvent(event);
}
