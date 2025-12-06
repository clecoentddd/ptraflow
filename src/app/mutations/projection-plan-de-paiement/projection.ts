
"use client";

import type { AppEvent, AppCommand, AppState } from '../mutation-lifecycle/domain';
import { eachMonthOfInterval, format, parse } from 'date-fns';

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

function applyPlanDeCalculValide(state: PlanDePaiementState, event: AppEvent): PlanDePaiementState {
    if (event.type !== 'PLAN_DE_CALCUL_VALIDE') return state;
    
    const { planDePaiementId, paiements, dateDebut, dateFin } = event.payload;

    const otherPlans = state.plansDePaiement.filter(p => p.id !== planDePaiementId);
    let currentPlan = state.plansDePaiement.find(p => p.id === planDePaiementId);

    if (!currentPlan) {
        currentPlan = { id: planDePaiementId, mutationId: event.mutationId, paiements: [] };
    }

    let finalPaiements: PaiementMensuel[];

    if (dateDebut && dateFin) { // This implies a DROITS mutation (replace)
        finalPaiements = paiements.map(p => ({
            planDePaiementId,
            mois: p.month,
            montant: p.aPayer,
        }));
    } else { // This implies a RESSOURCES mutation (patch)
        const updatedPaiements = [...currentPlan.paiements];
        const monthsToPatch = new Set(paiements.map(p => p.month));
        
        // Remove old payments for the patched months
        const filteredPaiements = updatedPaiements.filter(p => !monthsToPatch.has(p.mois));
        
        // Add new payments for the patched months
        const newPaiements = paiements.map(p => ({
            planDePaiementId,
            mois: p.month,
            montant: p.aPayer
        }));

        finalPaiements = [...filteredPaiements, ...newPaiements];
    }
    
    const updatedPlan: PlanDePaiement = { 
        ...currentPlan, 
        paiements: finalPaiements 
    };

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
            case 'PLAN_DE_CALCUL_VALIDE':
                return applyPlanDeCalculValide(state, event) as T;
        }
    }
    return state;
}

// --- Queries ---

export function queryPlanDePaiement(state: AppState): PlanDePaiement[] {
    return state.plansDePaiement;
}
