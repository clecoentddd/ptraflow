"use client";

import type { AppEvent, AppCommand, AppState } from '../mutation-lifecycle/domain';
import type { DecisionValideeEvent } from '../valider-decision/event';

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
function applyDecisionValidee(state: ValidatedPeriodsState, event: DecisionValideeEvent): ValidatedPeriodsState {
    
    // Only DROITS mutations set a new validated period.
    if (event.payload?.mutationType === 'DROITS' && event.payload?.periodeDroits) {
        const newValidatedPeriod: ValidatedPeriod = {
            mutationId: event.mutationId,
            dateDebut: event.payload.periodeDroits.dateDebut,
            dateFin: event.payload.periodeDroits.dateFin,
        };
        // Business rule: always overwrite with the latest validated period.
        return { ...state, validatedPeriods: [newValidatedPeriod] };
    }
    return state;
}

// 3. Slice Reducer
export function validatedPeriodsProjectionReducer<T extends ValidatedPeriodsState & { eventStream: AppEvent[] }>(
    state: T, 
    eventOrCommand: AppEvent | AppCommand
): T {
    if ('type' in eventOrCommand) {
        // This reducer only cares about events.
        if ('payload' in eventOrCommand) {
            const event = eventOrCommand;
            switch (event.type) {
                case 'DECISION_VALIDEE':
                    return applyDecisionValidee(state, event as DecisionValideeEvent) as T;
            }
        }
    }
    
    return state;
}

// 4. Query (Selector)
export function queryValidatedPeriods(state: AppState): ValidatedPeriod[] {
    return state.validatedPeriods;
}
