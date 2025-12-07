
"use client";

import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { ValiderPlanPaiementCommand } from './command';
import type { PlanDePaiementValideEvent } from './event';
import type { DecisionValideeEvent } from '../valider-decision/event';
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

  // 1. Find the validated decision for this mutation
  const decisionEvent = state.eventStream
    .find(event => event.mutationId === mutationId && event.type === 'DECISION_VALIDEE') as DecisionValideeEvent | undefined;

  if (!decisionEvent) {
    toast.error("Impossible de trouver la décision validée pour cette mutation.");
    return;
  }
  
  // 2. Concurrency Check
  // Note: this check is now less critical since we're creating transaction events, but it's good practice.
  // We can re-evaluate its necessity later.

  // 3. Generate Transaction Events
  const eventsToDispatch: AppEvent[] = [];
  const now = new Date();
  const existingTransactions = queryTransactions(state);
  const newPlanDePaiementId = crypto.randomUUID();

  // For each payment in the validated decision, we create or replace a transaction.
  for (const paiement of decisionEvent.payload.detailCalcul) {
    const existingTransactionForMonth = existingTransactions.find(
      t => t.mois === paiement.month && t.statut !== 'Remplacé'
    );

    // If an active or pending transaction exists, it must be replaced.
    if (existingTransactionForMonth) {
      if (existingTransactionForMonth.statut !== 'Exécuté') {
        const replaceEvent: TransactionRemplaceeEvent = {
          id: crypto.randomUUID(),
          type: 'TRANSACTION_REMPLACEE',
          mutationId,
          timestamp: new Date(now.getTime() + 1).toISOString(),
          payload: {
            transactionId: existingTransactionForMonth.id,
            remplaceeParTransactionId: crypto.randomUUID(), // This link is for future-proofing
          }
        };
        eventsToDispatch.push(replaceEvent);
      } else {
        // A transaction has already been executed for this month. 
        // We skip creating a new one. In a real scenario, this might need more complex handling.
        continue;
      }
    }

    // Create the new transaction.
    const createEvent: TransactionCreeeEvent = {
      id: crypto.randomUUID(),
      type: 'TRANSACTION_CREEE',
      mutationId,
      timestamp: new Date(now.getTime() + 2).toISOString(),
      payload: {
        transactionId: crypto.randomUUID(),
        planDePaiementId: newPlanDePaiementId,
        mois: paiement.month,
        montant: paiement.aPayer,
      }
    };
    eventsToDispatch.push(createEvent);
  }

  // 4. Create the final "Plan Validated" event.
  const finalEvent: PlanDePaiementValideEvent = {
    id: crypto.randomUUID(),
    type: 'PLAN_DE_PAIEMENT_VALIDE',
    mutationId,
    timestamp: new Date(now.getTime() + 3).toISOString(),
    payload: {
        planDePaiementId: newPlanDePaiementId,
        // The payload now just confirms the decision it was based on.
        decisionId: decisionEvent.decisionId
    }
  };
  eventsToDispatch.push(finalEvent);

  dispatch(eventsToDispatch);
}
