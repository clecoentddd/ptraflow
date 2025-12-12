
"use client";

import type { AppEvent, AppCommand, AppState } from '../mutation-lifecycle/domain';
import type { DecisionPreparteeEvent } from '../preparer-decision/event';
import type { DecisionDroitsPrepareeEvent } from '../preparer-decision-droits/event';
import type { DecisionRessourcesPrepareeEvent } from '../preparer-decision-ressources/event';

// --- State ---
// This projection now holds the full detail of the prepared decision.
export type DecisionHistoryEntry = DecisionPreparteeEvent | DecisionDroitsPrepareeEvent | DecisionRessourcesPrepareeEvent;

export interface DecisionHistoryState {
  decisionHistory: DecisionHistoryEntry[];
}

export const initialDecisionHistoryState: DecisionHistoryState = {
  decisionHistory: [],
};


// --- Projection Logic ---

function applyDecisionPrepartee(state: DecisionHistoryState, event: DecisionHistoryEntry): DecisionHistoryState {
    const newEntry: DecisionHistoryEntry = { 
        ...event
    };
    
    // Add the prepared decision to our history.
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
            case 'DECISION_PREPAREE':
            case 'DECISION_DROITS_PREPAREE':
            case 'DECISION_RESSOURCES_PREPAREE':
                // This projection now listens to DECISION_PREPAREE to store the "claim check" payload.
                return applyDecisionPrepartee(state, event as DecisionHistoryEntry) as T;
        }
    }
    return state;
}

// --- Queries ---

export function queryDecisionHistory(state: AppState): DecisionHistoryEntry[] {
    return state.decisionHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
