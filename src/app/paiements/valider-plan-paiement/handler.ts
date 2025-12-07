
"use client";

import type { AppState, AppEvent } from '../../mutations/mutation-lifecycle/domain';
import type { ValiderPlanPaiementCommand } from './command';
import type { PlanDePaiementValideEvent } from './event';
import type { DecisionValideeEvent } from '../../mutations/valider-decision/event';
import { toast } from 'react-hot-toast';

// Command Handler
export function validerPlanPaiementCommandHandler(
  state: AppState, 
  command: ValiderPlanPaiementCommand,
  dispatch: (event: AppEvent) => void
): void {
  const { mutationId } = command.payload;

  // 1. Find the validated decision for this mutation
  const decisionEvent = state.eventStream
    .find(event => event.mutationId === mutationId && event.type === 'DECISION_VALIDEE') as DecisionValideeEvent | undefined;

  if (!decisionEvent) {
    toast.error("Impossible de trouver la décision validée pour cette mutation.");
    return;
  }
  
  // 2. Create the "Plan Validated" event. It's now just a marker.
  const finalEvent: PlanDePaiementValideEvent = {
    id: crypto.randomUUID(),
    type: 'PLAN_DE_PAIEMENT_VALIDE',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        planDePaiementId: crypto.randomUUID(), // This could be the same as the decision's plan ID if it had one
        decisionId: decisionEvent.decisionId,
    }
  };

  dispatch(finalEvent);
}
