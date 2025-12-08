
"use client";

import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { PreparerTransactionsCommand } from './command';
import type { PlanDePaiementValideEvent } from '../valider-plan-paiement/event';
import type { TransactionCreeeEvent, TransactionRemplaceeEvent } from '../projection-transactions/events';
import { queryTransactions } from '../projection-transactions/projection';
import { toast } from 'react-hot-toast';

// Command Handler / Processor
export function preparerTransactionsCommandHandler(
  state: AppState, 
  command: PreparerTransactionsCommand,
  dispatch: (events: AppEvent[]) => void
): void {
  const { planDePaiementId, mutationId } = command.payload;
  const now = new Date();
  const generatedEvents: AppEvent[] = [];

  // 1. Find the source event: PlanDePaiementValideEvent
  const planEvent = state.eventStream.find(
      e => e.type === 'PLAN_DE_PAIEMENT_VALIDE' && (e.payload as any).planDePaiementId === planDePaiementId
  ) as PlanDePaiementValideEvent | undefined;

  if (!planEvent || !planEvent.payload.detailCalcul) {
    toast.error(`Plan de paiement valide (${planDePaiementId}) non trouvé ou sans détail.`);
    return;
  }
  
  const existingTransactions = queryTransactions(state);

  // 2. For each payment in the plan, create replacement and creation events
  planEvent.payload.detailCalcul.forEach((paiement, index) => {
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
    
    if (paiement.aPayer !== 0) { // Business Rule: Don't create zero-amount transactions
        const createEvent: TransactionCreeeEvent = {
            id: crypto.randomUUID(),
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
    }
  });
  
  dispatch(generatedEvents);
}
