
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
    // This logic is now correct: a transaction for a given month can only be executed
    // at the end of that month or later.
    const transactionMonth = parse(mois, 'MM-yyyy', new Date());
    if (isBefore(new Date(), endOfMonth(transactionMonth))) {
        toast.error("La transaction ne peut pas être exécutée avant la fin du mois concerné.");
        return;
    }
    
    // If all checks pass, create the event
    const event: TransactionEffectueeEvent = {
        id: crypto.randomUUID(),
        type: 'TRANSACTION_EFFECTUEE',
        mutationId: command.payload.mutationId,
        transactionId: transactionId, // The ID of the transaction being executed
        timestamp: new Date().toISOString(),
        payload: {} // Payload is empty as per the new structure
    };

    publishEvent(event);
}
