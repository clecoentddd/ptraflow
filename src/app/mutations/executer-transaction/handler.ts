"use client";

import type { AppState } from '../mutation-lifecycle/domain';
import type { ExecuterTransactionCommand } from './command';
import type { TransactionEffectueeEvent } from './event';
import { toast } from 'react-hot-toast';
import { queryPlanDePaiement } from '../projection-plan-de-paiement/projection';
import { parse, isBefore, endOfMonth } from 'date-fns';

// Command Handler
export function executerTransactionCommandHandler(
    state: AppState,
    command: ExecuterTransactionCommand
): AppState {
    const { transactionId, mois } = command.payload;
    const allPlans = queryPlanDePaiement(state);

    // 1. Find the latest payment plan in the system
    const latestPlan = allPlans.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    if (!latestPlan) {
        toast.error("Aucun plan de paiement n'a été trouvé.");
        return state;
    }

    // 2. Validity Check: does the transaction belong to the latest plan?
    const transaction = latestPlan.paiements.find(p => p.transactionId === transactionId);
    if (!transaction) {
        toast.error("Cette transaction n'est plus valide.");
        return state;
    }

    // 3. Execution Check: has this transaction already been executed?
    if (transaction.status === 'effectué') {
        toast.error("Transaction déjà effectuée.");
        return state;
    }

    // 4. Date Check: is the payment month in the past or current month?
    const transactionMonth = parse(mois, 'MM-yyyy', new Date());
    const currentMonth = new Date();
    if (!isBefore(transactionMonth, endOfMonth(currentMonth))) {
        toast.error("La transaction ne peut pas être exécutée dans le futur.");
        return state;
    }
    
    // If all checks pass, create the event
    const event: TransactionEffectueeEvent = {
        id: crypto.randomUUID(),
        type: 'TRANSACTION_EFFECTUEE',
        mutationId: command.payload.mutationId,
        timestamp: new Date().toISOString(),
        payload: {
            transactionId: transactionId,
        }
    };

    return { ...state, eventStream: [event, ...state.eventStream] };
}
