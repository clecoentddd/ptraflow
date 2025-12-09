
"use client";

import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { ExecuterTransactionCommand } from './command';
import type { TransactionEffectueeEvent } from '../projection-transactions/events';
import { toast } from 'react-hot-toast';
import { queryTransactions } from '../projection-transactions/projection';
import { parse, isBefore, endOfMonth } from 'date-fns';
import { publishEvent } from '../mutation-lifecycle/event-bus';

// Command Handler
export function executerTransactionCommandHandler(
    state: AppState,
    command: ExecuterTransactionCommand
): void {
    const { transactionId, mois } = command.payload;
    const allTransactions = queryTransactions(state);

    // 1. Find the transaction to execute
    const transaction = allTransactions.find(t => t.id === transactionId);
    
    if (!transaction) {
        toast.error("Cette transaction n'existe pas.");
        return;
    }

    // 2. Execution Check: has this transaction already been executed or replaced?
    if (transaction.statut !== 'A Exécuter') {
        toast.error(`Transaction déjà ${transaction.statut.toLowerCase()}.`);
        return;
    }

    // 3. Date Check: is the payment month in the past or current month?
    const transactionMonth = parse(mois, 'MM-yyyy', new Date());
    const currentMonth = new Date();
    if (!isBefore(transactionMonth, endOfMonth(currentMonth))) {
        toast.error("La transaction ne peut pas être exécutée avant la fin du mois concerné.");
        return;
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

    publishEvent(event);
}
