
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
  const now = new Date();
  const generatedEvents: AppEvent[] = [];

  // 1. Find the validated decision for this mutation
  const decisionEvent = state.eventStream
    .find(event => event.mutationId === mutationId && event.type === 'DECISION_VALIDEE') as DecisionValideeEvent | undefined;

  if (!decisionEvent) {
    toast.error("Impossible de trouver la décision validée pour cette mutation.");
    return;
  }
  
  const existingTransactions = queryTransactions(state);
  const planDePaiementId = crypto.randomUUID();

  // 2. For each payment in the decision, create replacement and creation events
  decisionEvent.payload.detailCalcul.forEach((paiement, index) => {
    // Find if a transaction for this month already exists and is not yet executed/replaced
    const transactionToReplace = existingTransactions.find(
        t => t.mois === paiement.month && t.statut === 'A Exécuter'
    );

    const newTransactionId = crypto.randomUUID();

    if (transactionToReplace) {
        const replaceEvent: TransactionRemplaceeEvent = {
            id: crypto.randomUUID(),
            type: 'TRANSACTION_REMPLACEE',
            mutationId,
            timestamp: new Date(now.getTime() + index * 2).toISOString(), // Ensure order
            payload: {
                transactionId: transactionToReplace.id,
                remplaceeParTransactionId: newTransactionId,
            }
        };
        generatedEvents.push(replaceEvent);
    }
    
    const createEvent: TransactionCreeeEvent = {
        id: newTransactionId, // Use the new transaction ID as the event ID
        type: 'TRANSACTION_CREEE',
        mutationId,
        timestamp: new Date(now.getTime() + index * 2 + 1).toISOString(), // Ensure order
        payload: {
            transactionId: newTransactionId,
            planDePaiementId,
            mois: paiement.month,
            montant: paiement.aPayer,
        }
    };
    generatedEvents.push(createEvent);
  });
  
  // 3. Create the final "Plan Validated" marker event.
  const finalEvent: PlanDePaiementValideEvent = {
    id: crypto.randomUUID(),
    type: 'PLAN_DE_PAIEMENT_VALIDE',
    mutationId,
    timestamp: new Date(now.getTime() + decisionEvent.payload.detailCalcul.length * 2).toISOString(),
    payload: {
        planDePaiementId,
        decisionId: decisionEvent.decisionId,
    }
  };
  generatedEvents.push(finalEvent);

  dispatch(generatedEvents);
}
