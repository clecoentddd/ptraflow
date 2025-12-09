
"use client";

import type { AppEvent, AppCommand, AppState } from '../mutation-lifecycle/domain';
import type { PlanCalculeEvent } from '../calculer-plan/event';
import type { MonthlyResult } from '../shared/plan-de-calcul.service';

// 1. State Slice and Initial State
export interface PlanCalcul {
    calculId: string;
    mutationId: string;
    timestamp: string;
    detail: MonthlyResult[];
}

export interface PlanCalculState {
  plansDeCalcul: PlanCalcul[];
}

export const initialPlanCalculState: PlanCalculState = {
  plansDeCalcul: [],
};


// 2. Projection Logic for this Slice
function applyPlanCalcule(state: PlanCalculState, event: PlanCalculeEvent): PlanCalculState {
    const newPlan: PlanCalcul = {
        calculId: event.payload.calculId,
        mutationId: event.mutationId,
        timestamp: event.timestamp,
        detail: event.payload.detail
    };
    
    // Replace if a plan with the same ID already exists, otherwise add it.
    const existingIndex = state.plansDeCalcul.findIndex(p => p.calculId === newPlan.calculId);
    const newPlans = [...state.plansDeCalcul];
    if (existingIndex !== -1) {
        newPlans[existingIndex] = newPlan;
    } else {
        newPlans.push(newPlan);
    }

    return { ...state, plansDeCalcul: newPlans };
}

function applyMutationAnnulee(state: PlanCalculState, event: AppEvent): PlanCalculState {
    if (event.type !== 'MUTATION_ANNULEE') return state;
    return {
        ...state,
        plansDeCalcul: state.plansDeCalcul.filter(p => p.mutationId !== event.mutationId)
    };
}


// 3. Slice Reducer
export function planCalculProjectionReducer<T extends PlanCalculState>(
    state: T, 
    eventOrCommand: AppEvent | AppCommand
): T {
    if ('type' in eventOrCommand && 'payload' in eventOrCommand) {
        const event = eventOrCommand as AppEvent;
        switch (event.type) {
            case 'PLAN_CALCUL_EFFECTUE':
                return applyPlanCalcule(state, event) as T;
            case 'MUTATION_ANNULEE':
                return applyMutationAnnulee(state, event) as T;
        }
    }
    return state;
}

// 4. Queries (Selectors)
export function queryPlansDeCalcul(state: AppState): PlanCalcul[] {
    return state.plansDeCalcul.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
