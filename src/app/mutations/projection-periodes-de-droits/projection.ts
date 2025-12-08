
"use client";

import type { AppEvent, AppCommand, AppState } from '../mutation-lifecycle/domain';
import type { PlanDePaiementValideEvent } from '../valider-plan-paiement/event';

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
function applyPlanDePaiementValide(state: ValidatedPeriodsState, event: PlanDePaiementValideEvent, fullEventStream: AppEvent[]): ValidatedPeriodsState {
    // We need the full event stream to find the original decision that contains the period.
    const decisionEvent = fullEventStream.find(e => e.type === 'DECISION_VALIDEE' && e.mutationId === event.mutationId) as any;
    
    // Only DROITS mutations set a new validated period.
    if (decisionEvent && decisionEvent.payload?.mutationType === 'DROITS' && decisionEvent.payload?.periodeDroits) {
        const newValidatedPeriod: ValidatedPeriod = {
            mutationId: event.mutationId,
            dateDebut: decisionEvent.payload.periodeDroits.dateDebut,
            dateFin: decisionEvent.payload.periodeDroits.dateFin,
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
                case 'PLAN_DE_PAIEMENT_VALIDE':
                    // Pass the full event stream to the handler
                    return applyPlanDePaiementValide(state, event, state.eventStream) as T;
            }
        }
    }
    
    return state;
}

// 4. Query (Selector)
export function queryValidatedPeriods(state: AppState): ValidatedPeriod[] {
    return state.validatedPeriods;
}
