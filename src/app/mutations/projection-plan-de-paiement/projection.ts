
"use client";

import type { AppEvent, AppCommand, AppState } from '../mutation-lifecycle/domain';
import type { PlanDePaiementValideEvent } from '../valider-plan-paiement/event';
import type { TransactionEffectueeEvent } from '../executer-transaction/event';

// --- State ---
export interface PaiementMensuel {
    planDePaiementId: string;
    mois: string; // "MM-yyyy"
    montant: number;
    transactionId: string;
    // Le statut est maintenant géré par la projection PaiementsAEffectuer
}

export interface PlanDePaiement {
    id: string; // planDePaiementId
    mutationId: string;
    timestamp: string;
    paiements: PaiementMensuel[];
}

export interface PlanDePaiementState {
  plansDePaiement: PlanDePaiement[];
}

export const initialPlanDePaiementState: PlanDePaiementState = {
  plansDePaiement: [],
};


// --- Projection Logic ---

function applyPlanDePaiementValide(state: PlanDePaiementState, event: PlanDePaiementValideEvent): PlanDePaiementState {
    const { planDePaiementId, paiements, dateDebut, dateFin } = event.payload;

    const allOtherPlans = state.plansDePaiement.filter(p => p.id !== planDePaiementId);
    
    let finalPaiements: PaiementMensuel[];

    if (dateDebut && dateFin) { // This implies a DROITS mutation (replace)
        finalPaiements = paiements.map(p => ({
            planDePaiementId,
            mois: p.month,
            montant: p.aPayer,
            transactionId: p.transactionId,
        }));
    } else { // This implies a RESSOURCES mutation (patch)
        const previousPlan = [...state.plansDePaiement]
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            [0];

        const basePaiements = previousPlan ? previousPlan.paiements : [];
        const monthsToPatch = new Set(paiements.map(p => p.month));
        
        const filteredPaiements = basePaiements.filter(p => !monthsToPatch.has(p.mois));
        
        const newPaiementsForPatch = paiements.map(p => ({
            planDePaiementId,
            mois: p.month,
            montant: p.aPayer,
            transactionId: p.transactionId,
        }));

        finalPaiements = [...filteredPaiements, ...newPaiementsForPatch];
    }
    
    const updatedPlan: PlanDePaiement = { 
        id: planDePaiementId,
        mutationId: event.mutationId,
        timestamp: event.timestamp,
        paiements: finalPaiements 
    };

    return { ...state, plansDePaiement: [...allOtherPlans, updatedPlan] };
}


// --- Reducer ---

export function planDePaiementProjectionReducer<T extends PlanDePaiementState>(
    state: T, 
    eventOrCommand: AppEvent | AppCommand
): T {
    if ('type' in eventOrCommand && 'payload' in eventOrCommand) {
        const event = eventOrCommand;
        switch (event.type) {
            case 'PLAN_DE_PAIEMENT_VALIDE':
                return applyPlanDePaiementValide(state, event as PlanDePaiementValideEvent) as T;
        }
    }
    return state;
}

// --- Queries ---

export function queryPlanDePaiement(state: AppState): PlanDePaiement[] {
    return state.plansDePaiement;
}
