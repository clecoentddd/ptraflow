
"use client";

import type { AppEvent, AppCommand, AppState } from '../mutation-lifecycle/domain';
import type { TransactionEffectueeEvent } from '../executer-transaction/event';
import type { PlanDePaiementValideEvent } from '../../paiements/valider-plan-paiement/event';

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
    let newTransactions = [...state.transactions];

    for (const paiement of event.payload.detailCalcul) {
        // Find if a transaction for this month already exists and is not yet executed/replaced
        const existingTransactionIndex = newTransactions.findIndex(
            t => t.mois === paiement.month && t.statut === 'A Exécuter'
        );

        if (existingTransactionIndex !== -1) {
            // Mark the old one as replaced
            newTransactions[existingTransactionIndex] = {
                ...newTransactions[existingTransactionIndex],
                statut: 'Remplacé'
            };
        }

        // Create the new transaction
        const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            planDePaiementId: event.payload.planDePaiementId,
            mutationId: event.mutationId,
            mois: paiement.month,
            montant: paiement.aPayer,
            statut: 'A Exécuter',
        };
        newTransactions.push(newTransaction);
    }
    
    return { ...state, transactions: newTransactions };
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
        }
    }
    return state;
}

// --- Queries ---

export function queryTransactions(state: AppState): Transaction[] {
    // Sort by month, then by status to keep active ones visible
    return [...state.transactions].sort((a, b) => {
        const dateA = new Date(a.mois.split('-')[1], parseInt(a.mois.split('-')[0]) - 1);
        const dateB = new Date(b.mois.split('-')[1], parseInt(b.mois.split('-')[0]) - 1);
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
        }
        // If months are equal, sort by status
        const statusOrder = { 'A Exécuter': 1, 'Exécuté': 2, 'Remplacé': 3 };
        return statusOrder[a.statut] - statusOrder[b.statut];
    });
}
