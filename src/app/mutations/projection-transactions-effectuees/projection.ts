
"use client";

import type { AppEvent, AppCommand, AppState } from '../mutation-lifecycle/domain';
import type { TransactionEffectueeEvent } from '../executer-transaction/event';

// --- State ---
export interface TransactionsEffectueesState {
  transactionsEffectuees: Set<string>; // Set of transactionIds
}

export const initialTransactionsEffectueesState: TransactionsEffectueesState = {
  transactionsEffectuees: new Set(),
};


// --- Projection Logic ---

function applyTransactionEffectuee(state: TransactionsEffectueesState, event: TransactionEffectueeEvent): TransactionsEffectueesState {
    const newSet = new Set(state.transactionsEffectuees);
    newSet.add(event.payload.transactionId);
    return { ...state, transactionsEffectuees: newSet };
}


// --- Reducer ---

export function transactionsEffectueesProjectionReducer<T extends TransactionsEffectueesState>(
    state: T, 
    eventOrCommand: AppEvent | AppCommand
): T {
    if ('type' in eventOrCommand && 'payload' in eventOrCommand) {
        const event = eventOrCommand;
        switch (event.type) {
            case 'TRANSACTION_EFFECTUEE':
                return applyTransactionEffectuee(state, event as TransactionEffectueeEvent) as T;
        }
    }
    return state;
}

// --- Queries ---

export function queryTransactionsEffectuees(state: AppState): Set<string> {
    return state.transactionsEffectuees;
}
