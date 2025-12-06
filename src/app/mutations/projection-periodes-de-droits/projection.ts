

"use client";

import type { AppEvent, AppCommand, AppState } from '../mutation-lifecycle/domain';
import type { PlanPaiementValideEvent } from '../valider-plan-paiement/event';

// 1. State Slice and Initial State
export interface ValidatedPeriod {
  mutationId: string;
  dateDebut: string;
  dateFin: string;
}

export interface ValidatedPeriodsState {
  validatedPeriods: ValidatedPeriod[];
}

export const initialValidatedPeriodsState: ValidatedPeriodsState = {
  validatedPeriods: [],
};


// 2. Projection Logic for this Slice
function applyPlanPaiementValide(state: ValidatedPeriodsState, event: PlanPaiementValideEvent): ValidatedPeriodsState {
    if (event.payload.dateDebut && event.payload.dateFin) {
        const newValidatedPeriod: ValidatedPeriod = {
            mutationId: event.mutationId,
            dateDebut: event.payload.dateDebut,
            dateFin: event.payload.dateFin,
        };
        // Business rule: always overwrite with the latest validated period.
        return { ...state, validatedPeriods: [newValidatedPeriod] };
    }
    return state;
}

// 3. Slice Reducer
export function validatedPeriodsProjectionReducer<T extends ValidatedPeriodsState>(
    state: T, 
    eventOrCommand: AppEvent | AppCommand
): T {
    if ('type' in eventOrCommand) {
        // This reducer only cares about events.
        if ('payload' in eventOrCommand) {
            const event = eventOrCommand;
            switch (event.type) {
                case 'PLAN_PAIEMENT_VALIDE':
                    return applyPlanPaiementValide(state, event) as T;
            }
        }
    }
    
    return state;
}

// 4. Query (Selector)
export function queryValidatedPeriods(state: AppState): ValidatedPeriod[] {
    return state.validatedPeriods;
}
