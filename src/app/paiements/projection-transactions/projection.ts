
"use client";

import type { AppEvent, AppCommand, AppState } from '../../mutations/mutation-lifecycle/domain';
import type { TransactionCreeeEvent, TransactionEffectueeEvent, TransactionRemplaceeEvent } from './events';
import type { PlanDePaiementValideEvent } from '../valider-plan-paiement/event';

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

function applyPlanDePaiementValide(state: TransactionsState, event: PlanDePaiementValideEvent): TransactionsState {
    let currentTransactions = [...state.transactions];
    const { planDePaiementId, paiements } = event.payload;

    for (const paiement of paiements) {
        // Find if an active transaction for this month already exists
        const existingTransactionForMonth = currentTransactions.find(
            t => t.mois === paiement.mois && t.statut === 'A Exécuter'
        );

        // If it exists and has not been executed, mark it as 'Remplacé'
        if (existingTransactionForMonth) {
            currentTransactions = currentTransactions.map(t => 
                t.id === existingTransactionForMonth.id ? { ...t, statut: 'Remplacé' } : t
            );
        }

        // Create the new transaction
        const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            planDePaiementId,
            mutationId: event.mutationId,
            mois: paiement.mois,
            montant: paiement.montant,
            statut: 'A Exécuter',
        };
        currentTransactions.push(newTransaction);
    }
    
    return { ...state, transactions: currentTransactions };
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
            case 'PLAN_DE_PAIEMENT_VALIDE':
                return applyPlanDePaiementValide(state, event as PlanDePaiementValideEvent) as T;
            case 'TRANSACTION_EFFECTUEE':
                return applyTransactionEffectuee(state, event as TransactionEffectueeEvent) as T;
            // The logic for TRANSACTION_CREEE and TRANSACTION_REMPLACEE is now inside `applyPlanDePaiementValide`
            // so we no longer need to listen for them individually.
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
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
        }
        // If months are equal, sort by status to keep active ones visible
        const statusOrder = { 'A Exécuter': 1, 'Exécuté': 2, 'Remplacé': 3 };
        return statusOrder[a.statut] - statusOrder[b.statut];
    });
}
