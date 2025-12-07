
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
  
  // 2. Generate Transaction Events
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
        const remplaceeParId = crypto.randomUUID(); // This ID will be used for the new transaction
        const replaceEvent: TransactionRemplaceeEvent = {
          id: crypto.randomUUID(),
          type: 'TRANSACTION_REMPLACEE',
          mutationId,
          timestamp: new Date(now.getTime() + 1).toISOString(),
          payload: {
            transactionId: existingTransactionForMonth.id,
            remplaceeParTransactionId: remplaceeParId,
          }
        };
        eventsToDispatch.push(replaceEvent);
        
         // Create the new transaction that replaces the old one.
        const createEvent: TransactionCreeeEvent = {
          id: crypto.randomUUID(),
          type: 'TRANSACTION_CREEE',
          mutationId,
          timestamp: new Date(now.getTime() + 2).toISOString(),
          payload: {
            transactionId: remplaceeParId,
            planDePaiementId: newPlanDePaiementId,
            mois: paiement.month,
            montant: paiement.aPayer,
          }
        };
        eventsToDispatch.push(createEvent);

      } else {
        // A transaction has already been executed for this month. 
        // We skip creating a new one. In a real scenario, this might need more complex handling.
        continue;
      }
    } else {
       // No existing transaction for this month, just create a new one.
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
  }

  // 3. Create the final "Plan Validated" event.
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
