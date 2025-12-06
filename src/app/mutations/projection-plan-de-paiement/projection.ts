
"use client";

import type { AppEvent, AppCommand, AppState } from '../mutation-lifecycle/domain';

// --- State ---
export interface PaiementMensuel {
    planDePaiementId: string;
    mois: string; // "MM-yyyy"
    montant: number;
}

export interface PlanDePaiement {
    id: string; // planDePaiementId
    mutationId: string;
    paiements: PaiementMensuel[];
}

export interface PlanDePaiementState {
  plansDePaiement: PlanDePaiement[];
}

export const initialPlanDePaiementState: PlanDePaiementState = {
  plansDePaiement: [],
};


// --- Projection Logic ---

function applyPlanPaiementRemplace(state: PlanDePaiementState, event: AppEvent): PlanDePaiementState {
    if (event.type !== 'PLAN_PAIEMENT_REMPLACE') return state;

    const { planDePaiementId, paiements } = event.payload;

    const newPaiements = paiements.map(p => ({
        planDePaiementId,
        mois: p.month,
        montant: p.aPayer
    }));

    // For a replacement, we remove all previous payments for the same plan ID and add the new ones.
    const otherPlans = state.plansDePaiement.filter(p => p.id !== planDePaiementId);
    
    const newPlan: PlanDePaiement = {
        id: planDePaiementId,
        mutationId: event.mutationId,
        paiements: newPaiements
    };

    return { ...state, plansDePaiement: [...otherPlans, newPlan] };
}

function applyPlanPaiementPatched(state: PlanDePaiementState, event: AppEvent): PlanDePaiementState {
    if (event.type !== 'PLAN_PAIEMENT_PATCHE') return state;

    const { planDePaiementId, paiements } = event.payload;
    
    let plan = state.plansDePaiement.find(p => p.id === planDePaiementId);

    if (!plan) { // First time we see this plan
        plan = { id: planDePaiementId, mutationId: event.mutationId, paiements: [] };
    }

    const updatedPaiements = [...plan.paiements];
    const monthsToPatch = new Set(paiements.map(p => p.month));
    
    // Remove old payments for the patched months
    const filteredPaiements = updatedPaiements.filter(p => !monthsToPatch.has(p.mois));
    
    // Add new payments for the patched months
    const newPaiements = paiements.map(p => ({
        planDePaiementId,
        mois: p.month,
        montant: p.aPayer
    }));
    
    const finalPaiements = [...filteredPaiements, ...newPaiements];
    
    const updatedPlan = { ...plan, paiements: finalPaiements };

    const otherPlans = state.plansDePaiement.filter(p => p.id !== planDePaiementId);

    return { ...state, plansDePaiement: [...otherPlans, updatedPlan] };
}


// --- Reducer ---

export function planDePaiementProjectionReducer<T extends PlanDePaiementState>(
    state: T, 
    eventOrCommand: AppEvent | AppCommand
): T {
    if ('type' in eventOrCommand && 'payload' in eventOrCommand) {
        const event = eventOrCommand;
        switch (event.type) {
            case 'PLAN_PAIEMENT_REMPLACE':
                return applyPlanPaiementRemplace(state, event) as T;
            case 'PLAN_PAIEMENT_PATCHE':
                return applyPlanPaiementPatched(state, event) as T;
        }
    }
    return state;
}

// --- Queries ---

export function queryPlanDePaiement(state: AppState): PlanDePaiement[] {
    return state.plansDePaiement;
}
