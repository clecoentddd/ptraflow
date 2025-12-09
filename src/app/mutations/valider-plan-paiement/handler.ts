
"use client";

import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { ValiderPlanPaiementCommand } from './command';
import type { PlanDePaiementValideEvent } from './event';
import { toast } from 'react-hot-toast';
import { publishEvent } from '../mutation-lifecycle/event-bus';
import { queryDecisionHistory } from '../projection-decision-history/projection';
import type { DecisionValideeEvent } from '../valider-decision/event';

// Command Handler (triggered by Event Bus Process Manager)
export function validerPlanPaiementCommandHandler(
  state: AppState, 
  command: ValiderPlanPaiementCommand
): void {
  const { mutationId } = command.payload;

  // 1. Find the `DecisionValideeEvent` for this mutation to get the `decisionId`.
  const decisionValideeEvent = state.eventStream.find(
      e => e.mutationId === mutationId && e.type === 'DECISION_VALIDEE'
  ) as DecisionValideeEvent | undefined;
  
  if (!decisionValideeEvent) {
      toast.error("Événement de décision validée non trouvé pour créer le plan de paiement.");
      return;
  }
  const { decisionId } = decisionValideeEvent.payload;

  // 2. "Claim Check": Use the `decisionId` to get the full payload from the history projection.
  const decisionHistory = queryDecisionHistory(state);
  const decisionDetails = decisionHistory.find(d => d.payload.decisionId === decisionId);

  if (!decisionDetails) {
    toast.error(`Détails de la décision (${decisionId}) non trouvés dans l'historique.`);
    return;
  }
  
  // 3. Create the "Plan Validated" event.
  const finalEvent: PlanDePaiementValideEvent = {
    id: crypto.randomUUID(),
    type: 'PLAN_DE_PAIEMENT_VALIDE',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        planDePaiementId: crypto.randomUUID(),
        decisionId: decisionDetails.payload.decisionId,
        detailCalcul: decisionDetails.payload.detail.map(d => ({ month: d.month, aPayer: d.aPayer }))
    }
  };

  publishEvent(finalEvent);
}
