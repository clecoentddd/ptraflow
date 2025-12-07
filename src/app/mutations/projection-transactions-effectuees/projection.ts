"use client";

import type { AppEvent, AppCommand, AppState } from '../mutation-lifecycle/domain';
import type { TransactionEffectueeEvent } from '../executer-transaction/event';

// 1. State Slice and Initial State
export interface TransactionsEffectueesState {
  transactionsEffectuees: string[]; // List of executed transaction IDs
}

export const initialTransactionsEffectueesState: TransactionsEffectueesState = {
  transactionsEffectuees: [],
};


// 2. Projection Logic for this Slice
function applyTransactionEffectuee(state: TransactionsEffectueesState, event: TransactionEffectueeEvent): TransactionsEffectueesState {
    const { transactionId } = event.payload;
    if (state.transactionsEffectuees.includes(transactionId)) {
        return state; // Idempotency
    }
    return { 
        ...state, 
        transactionsEffectuees: [...state.transactionsEffectuees, transactionId] 
    };
}


// 3. Slice Reducer
export function transactionsEffectueesProjectionReducer<T extends TransactionsEffectueesState>(
    state: T, 
    eventOrCommand: AppEvent | AppCommand
): T {
     if ('type' in eventOrCommand && eventOrCommand.type === 'TRANSACTION_EFFECTUEE') {
        return applyTransactionEffectuee(state, eventOrCommand as TransactionEffectueeEvent) as T;
    }
    return state;
}

// 4. Queries (Selectors)
export function queryTransactionsEffectuees(state: AppState): string[] {
    return state.transactionsEffectuees;
}
