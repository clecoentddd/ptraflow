
"use client";

import type { AppEvent, AppCommand, AppState } from '../mutation-lifecycle/domain';
import type { DecisionValideeEvent } from '../valider-decision/event';
import type { DroitsAnalysesEvent } from '../analyze-droits/event';
import type { DecisionPreparteeEvent } from '../preparer-decision/event';
import { queryDecisionHistory } from '../projection-decision-history/projection';

// 1. State Slice and Initial State
export interface ValidatedPeriod {
  mutationId: string;
  dateDebut: string;
  dateFin: string;
}

export interface AnalyzedPeriod {
  mutationId: string;
  dateDebut: string;
  dateFin: string;
}

export interface ValidatedPeriodsState {
  validatedPeriods: ValidatedPeriod[];
  analyzedPeriods: AnalyzedPeriod[];
}

export const initialValidatedPeriodsState: ValidatedPeriodsState = {
  validatedPeriods: [],
  analyzedPeriods: [],
};


// 2. Projection Logic for this Slice
function applyDecisionValidee(state: AppState, event: DecisionValideeEvent): ValidatedPeriodsState {
    
    // "Claim Check" Pattern: Use the decisionId from the event to look up the full details.
    const decisionDetails = queryDecisionHistory(state).find(d => (d as DecisionPreparteeEvent).payload.decisionId === event.payload.decisionId);

    if (!decisionDetails) {
        console.error(`[validatedPeriodsProjection] Could not find details for decisionId ${event.payload.decisionId}`);
        return state;
    }

    const { mutationType, periodeDroits } = (decisionDetails as DecisionPreparteeEvent).payload;

    // Only DROITS mutations set a new validated period.
    if (mutationType === 'DROITS' && periodeDroits) {
        const newValidatedPeriod: ValidatedPeriod = {
            mutationId: event.mutationId,
            dateDebut: periodeDroits.dateDebut,
            dateFin: periodeDroits.dateFin,
        };
        // Business rule: add the new period to the history, don't overwrite.
        return { ...state, validatedPeriods: [...state.validatedPeriods, newValidatedPeriod] };
    }
    return state;
}

function applyDroitsAnalyses(state: AppState, event: DroitsAnalysesEvent): ValidatedPeriodsState {
    const newAnalyzedPeriod: AnalyzedPeriod = {
        mutationId: event.mutationId,
        dateDebut: event.payload.dateDebut,
        dateFin: event.payload.dateFin,
    };
    
    // Replace existing analyzed period for this mutation if any
    const otherPeriods = state.analyzedPeriods.filter(p => p.mutationId !== event.mutationId);
    
    return { 
        ...state, 
        analyzedPeriods: [...otherPeriods, newAnalyzedPeriod] 
    };
}

// 3. Slice Reducer
export function validatedPeriodsProjectionReducer(
    state: AppState, 
    eventOrCommand: AppEvent | AppCommand
): AppState {
    if ('type' in eventOrCommand) {
        // This reducer only cares about events.
        if ('payload' in eventOrCommand) {
            const event = eventOrCommand;
            switch (event.type) {
                case 'DECISION_VALIDEE':
                    // Pass the full AppState to the apply function
                    const newValidatedPeriodsState = applyDecisionValidee(state, event as DecisionValideeEvent);
                    return { ...state, ...newValidatedPeriodsState };
                case 'DROITS_ANALYSES':
                    const newAnalyzedState = applyDroitsAnalyses(state, event as DroitsAnalysesEvent);
                    return { ...state, ...newAnalyzedState };
            }
        }
    }
    
    return state;
}

// 4. Query (Selector)
export function queryValidatedPeriods(state: AppState): ValidatedPeriod[] {
    return state.validatedPeriods.sort((a,b) => {
        const aEvent = state.eventStream.find(e => e.mutationId === a.mutationId && e.type === 'DECISION_VALIDEE');
        const bEvent = state.eventStream.find(e => e.mutationId === b.mutationId && e.type === 'DECISION_VALIDEE');
        if (!aEvent || !bEvent) return 0;
        return new Date(bEvent.timestamp).getTime() - new Date(aEvent.timestamp).getTime();
    });
}

export function queryAnalyzedPeriods(state: AppState): AnalyzedPeriod[] {
    return state.analyzedPeriods;
}
