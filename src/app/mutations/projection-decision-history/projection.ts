
"use client";

import type { AppEvent, AppCommand, AppState } from '../../mutation-lifecycle/domain';
import type { DecisionValideeEvent } from '../../valider-decision/event';

// --- State ---
export interface DecisionHistoryEntry extends DecisionValideeEvent {}

export interface DecisionHistoryState {
  decisionHistory: DecisionHistoryEntry[];
}

export const initialDecisionHistoryState: DecisionHistoryState = {
  decisionHistory: [],
};


// --- Projection Logic ---

function applyDecisionValidee(state: DecisionHistoryState, event: DecisionValideeEvent): DecisionHistoryState {
    const newEntry: DecisionHistoryEntry = { 
        ...event
    };
    
    return { ...state, decisionHistory: [...state.decisionHistory, newEntry] };
}


// --- Reducer ---

export function decisionHistoryProjectionReducer<T extends DecisionHistoryState>(
    state: T, 
    eventOrCommand: AppEvent | AppCommand
): T {
    if ('type' in eventOrCommand && 'payload' in eventOrCommand) {
        const event = eventOrCommand;
        switch (event.type) {
            case 'DECISION_VALIDEE':
                return applyDecisionValidee(state, event as DecisionValideeEvent) as T;
        }
    }
    return state;
}

// --- Queries ---

export function queryDecisionHistory(state: AppState): DecisionHistoryEntry[] {
    return state.decisionHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
