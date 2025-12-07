
"use client";

import type { AppState, AppEvent } from '../../mutations/mutation-lifecycle/domain';
import type { ValiderPlanPaiementCommand } from './command';
import type { PlanDePaiementValideEvent } from './event';
import type { DecisionValideeEvent } from '../../mutations/valider-decision/event';
import { toast } from 'react-hot-toast';
import { queryTransactions } from '../projection-transactions/projection';
import type { TransactionCreeeEvent, TransactionRemplaceeEvent } from '../projection-transactions/events';

// Command Handler
export function validerPlanPaiementCommandHandler(
  state: AppState, 
  command: ValiderPlanPaiementCommand,
  dispatch: (events: AppEvent[]) => void
): void {
  const { mutationId } = command.payload;

  // 1. Find the validated decision for this mutation to get the data
  const decisionEvent = state.eventStream
    .find(event => event.mutationId === mutationId && event.type === 'DECISION_VALIDEE') as DecisionValideeEvent | undefined;

  if (!decisionEvent) {
    toast.error("Impossible de trouver la décision validée pour cette mutation.");
    return;
  }
  
  // 2. Prepare the main event payload
  const newPlanDePaiementId = crypto.randomUUID();
  const paiementsAAjouter = decisionEvent.payload.detailCalcul.map(p => ({
      mois: p.month,
      montant: p.aPayer
  }));

  // 3. Create the final "Plan Validated" event, which now carries the data.
  const planValideEvent: PlanDePaiementValideEvent = {
    id: crypto.randomUUID(),
    type: 'PLAN_DE_PAIEMENT_VALIDE',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        planDePaiementId: newPlanDePaiementId,
        decisionId: decisionEvent.decisionId,
        paiements: paiementsAAjouter
    }
  };

  // Dispatch only this single, authoritative event.
  // The projections will handle the transaction creation logic.
  dispatch([planValideEvent]);
}
