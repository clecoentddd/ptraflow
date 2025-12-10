
"use client";

import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { PreparerTransactionsCommand } from './command';
import type { PlanDePaiementValideEvent } from '../valider-plan-paiement/event';
import type { TransactionCreeeEvent, TransactionRemplaceeEvent } from '../projection-transactions/events';
import { queryTransactions } from '../projection-transactions/projection';
import { toast } from 'react-hot-toast';
import { publishEvents } from '../mutation-lifecycle/event-bus';

// Command Handler / Processor
// This handler now receives the event directly, which is more robust
// as it doesn't depend on the event being present in the state yet.
export function preparerTransactionsCommandHandler(
  state: AppState, 
  planEvent: PlanDePaiementValideEvent
): void {
  const { id: planDePaiementId, mutationId } = planEvent;
  const now = new Date();
  const generatedEvents: AppEvent[] = [];

  if (!planEvent.payload.detailCalcul) {
    toast.error(`Le plan de paiement valide (${planDePaiementId}) est sans détail de calcul.`);
    return;
  }
  
  const existingTransactions = queryTransactions(state);

  // 2. For each payment in the plan, create replacement and creation events
  planEvent.payload.detailCalcul.forEach((paiement, index) => {
    // Find if a transaction for this month already exists and is not yet executed/replaced
    // We use filter to handle potential duplicates (though unlikely) and ensure we replace all pending ones.
    const transactionsToReplace = existingTransactions.filter(
        t => t.mois === paiement.month && t.statut === 'A Exécuter'
    );

    const newTransactionId = crypto.randomUUID();

    transactionsToReplace.forEach((transactionToReplace, i) => {
        const replaceEvent: TransactionRemplaceeEvent = {
            id: crypto.randomUUID(),
            type: 'TRANSACTION_REMPLACEE',
            mutationId,
            timestamp: new Date(now.getTime() + index * 10 + i).toISOString(), // Ensure order
            payload: {
                transactionId: transactionToReplace.id,
                remplaceeParTransactionId: newTransactionId,
            }
        };
        generatedEvents.push(replaceEvent);
    });
    
    if (paiement.aPayer !== 0) { // Business Rule: Don't create zero-amount transactions
        const createEvent: TransactionCreeeEvent = {
            id: crypto.randomUUID(),
            type: 'TRANSACTION_CREEE',
            mutationId,
            timestamp: new Date(now.getTime() + index * 10 + 5).toISOString(), // Ensure order
            payload: {
                transactionId: newTransactionId,
                planDePaiementId,
                mois: paiement.month,
                montant: paiement.aPayer,
            }
        };
        generatedEvents.push(createEvent);
    }
  });
  
  publishEvents(generatedEvents);
}
