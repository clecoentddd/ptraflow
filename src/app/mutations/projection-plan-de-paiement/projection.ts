
"use client";

import type { AppEvent, AppCommand, AppState } from '../../mutation-lifecycle/domain';
import type { PlanDePaiementValideEvent } from '../../valider-plan-paiement/event';

// --- State ---
// This projection now only serves as a historical record of validated plans.
export interface PlanDePaiement {
    id: string; // planDePaiementId
    mutationId: string;
    decisionId: string;
    timestamp: string;
}

export interface PlanDePaiementState {
  plansDePaiement: PlanDePaiement[];
}

export const initialPlanDePaiementState: PlanDePaiementState = {
  plansDePaiement: [],
};


// --- Projection Logic ---

function applyPlanDePaiementValide(state: PlanDePaiementState, event: PlanDePaiementValideEvent): PlanDePaiementState {
    const newPlan: PlanDePaiement = { 
        id: event.payload.planDePaiementId,
        mutationId: event.mutationId,
        decisionId: event.payload.decisionId,
        timestamp: event.timestamp,
    };
    
    return { ...state, plansDePaiement: [...state.plansDePaiement, newPlan] };
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
    return state.plansDePaiement.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
