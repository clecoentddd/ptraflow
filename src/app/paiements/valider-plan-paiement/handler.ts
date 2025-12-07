
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
  
  // 2. Create the "Plan Validated" event, including the payment details.
  const finalEvent: PlanDePaiementValideEvent = {
    id: crypto.randomUUID(),
    type: 'PLAN_DE_PAIEMENT_VALIDE',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        planDePaiementId: crypto.randomUUID(),
        decisionId: decisionEvent.decisionId,
        detailCalcul: decisionEvent.payload.detailCalcul.map(d => ({ month: d.month, aPayer: d.aPayer }))
    }
  };

  dispatch(finalEvent);
}
