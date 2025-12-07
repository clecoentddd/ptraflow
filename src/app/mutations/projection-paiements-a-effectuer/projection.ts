
"use client";

import type { AppEvent, AppCommand, AppState } from '../mutation-lifecycle/domain';
import type { PlanDePaiementValideEvent } from '../valider-plan-paiement/event';
import type { TransactionEffectueeEvent } from '../executer-transaction/event';

// --- State ---
export interface PaiementAEffectuer {
    mutationId: string;
    transactionId: string;
    mois: string; // "MM-yyyy"
    montant: number;
}

export interface PaiementsAEffectuerState {
  paiementsAEffectuer: PaiementAEffectuer[];
}

export const initialPaiementsAEffectuerState: PaiementsAEffectuerState = {
  paiementsAEffectuer: [],
};


// --- Projection Logic ---

function applyPlanDePaiementValide(state: PaiementsAEffectuerState, event: PlanDePaiementValideEvent): PaiementsAEffectuerState {
    const { paiements, dateDebut } = event.payload;
    const { mutationId } = event;

    const newPaiements = paiements.map(p => ({
        mutationId,
        transactionId: p.transactionId,
        mois: p.month,
        montant: p.aPayer,
    }));

    // Si dateDebut existe, c'est une mutation de droits : on remplace TOUS les paiements à effectuer.
    if (dateDebut) {
        return { ...state, paiementsAEffectuer: newPaiements };
    }

    // Sinon, c'est une mutation de ressources : on patche la liste existante.
    const newMonths = new Set(newPaiements.map(p => p.mois));
    const oldPaiementsToKeep = state.paiementsAEffectuer.filter(p => !newMonths.has(p.mois));
    
    return { ...state, paiementsAEffectuer: [...oldPaiementsToKeep, ...newPaiements] };
}

function applyTransactionEffectuee(state: PaiementsAEffectuerState, event: TransactionEffectueeEvent): PaiementsAEffectuerState {
    return {
        ...state,
        paiementsAEffectuer: state.paiementsAEffectuer.filter(p => p.transactionId !== event.payload.transactionId)
    };
}


// --- Reducer ---

export function paiementsAEffectuerProjectionReducer<T extends PaiementsAEffectuerState>(
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

export function queryPaiementsAEffectuer(state: AppState): PaiementAEffectuer[] {
    // Sort by month
    return [...state.paiementsAEffectuer].sort((a,b) => a.mois.localeCompare(b.mois));
}
