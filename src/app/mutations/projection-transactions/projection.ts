
"use client";

import type { AppEvent, AppCommand, AppState } from '../mutation-lifecycle/domain';
import type { TransactionCreeeEvent, TransactionEffectueeEvent, TransactionRemplaceeEvent } from './events';

// --- State ---
export type TransactionStatut = 'A Exécuter' | 'Exécuté' | 'Remplacé';

export interface Transaction {
    id: string; // transactionId
    planDePaiementId: string;
    mutationId: string;
    mois: string; // "MM-yyyy"
    montant: number;
    statut: TransactionStatut;
}

export interface TransactionsState {
  transactions: Transaction[];
}

export const initialTransactionsState: TransactionsState = {
  transactions: [],
};


// --- Projection Logic ---

function applyTransactionCreee(state: TransactionsState, event: TransactionCreeeEvent): TransactionsState {
    const newTransaction: Transaction = {
        id: event.payload.transactionId,
        planDePaiementId: event.payload.planDePaiementId,
        mutationId: event.mutationId,
        mois: event.payload.mois,
        montant: event.payload.montant,
        statut: 'A Exécuter',
    };
    
    // Add the new transaction to the list
    return { ...state, transactions: [...state.transactions, newTransaction] };
}

function applyTransactionRemplacee(state: TransactionsState, event: TransactionRemplaceeEvent): TransactionsState {
    return {
        ...state,
        transactions: state.transactions.map(t => 
            t.id === event.payload.transactionId 
            ? { ...t, statut: 'Remplacé' } 
            : t
        )
    };
}

function applyTransactionEffectuee(state: TransactionsState, event: TransactionEffectueeEvent): TransactionsState {
    return {
        ...state,
        transactions: state.transactions.map(t => 
            t.id === event.payload.transactionId 
            ? { ...t, statut: 'Exécuté' } 
            : t
        )
    };
}


// --- Reducer ---

export function transactionsProjectionReducer<T extends TransactionsState>(
    state: T, 
    eventOrCommand: AppEvent | AppCommand
): T {
    if ('type' in eventOrCommand && 'payload' in eventOrCommand) {
        const event = eventOrCommand;
        switch (event.type) {
            case 'TRANSACTION_CREEE':
                return applyTransactionCreee(state, event as TransactionCreeeEvent) as T;
            case 'TRANSACTION_REMPLACEE':
                return applyTransactionRemplacee(state, event as TransactionRemplaceeEvent) as T;
            case 'TRANSACTION_EFFECTUEE':
                return applyTransactionEffectuee(state, event as TransactionEffectueeEvent) as T;
        }
    }
    return state;
}

// --- Queries ---

export function queryTransactions(state: AppState): Transaction[] {
    // Sort by month
    return [...state.transactions].sort((a, b) => {
        const dateA = new Date(a.mois.split('-')[1], parseInt(a.mois.split('-')[0]) - 1);
        const dateB = new Date(b.mois.split('-')[1], parseInt(b.mois.split('-')[0]) - 1);
        return dateA.getTime() - dateB.getTime();
    });
}
