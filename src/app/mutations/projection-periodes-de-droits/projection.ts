
"use client";

import type { AppEvent, AppCommand } from '../mutation-lifecycle/cqrs';
import type { MutationValidatedEvent } from '../validate-mutation/event';

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
function applyMutationValidated(state: ValidatedPeriodsState, event: MutationValidatedEvent): ValidatedPeriodsState {
    if (event.payload.dateDebut && event.payload.dateFin) {
        const newValidatedPeriod: ValidatedPeriod = {
            mutationId: event.mutationId,
            dateDebut: event.payload.dateDebut,
            dateFin: event.payload.dateFin,
        };
        // Business rule: always overwrite with the latest validated period based on timestamp.
        // We expect events to be replayed in chronological order, so the last one wins.
        return { ...state, validatedPeriods: [newValidatedPeriod] };
    }
    return state;
}

// 3. Slice Reducer
export function validatedPeriodsProjectionReducer<T extends ValidatedPeriodsState>(
    state: T, 
    eventOrCommand: AppEvent | AppCommand
): T {
    // This reducer only cares about events.
    if ('payload' in eventOrCommand) {
        const event = eventOrCommand;
        switch (event.type) {
            case 'MUTATION_VALIDATED':
                // Pass the event to the dedicated projection logic function
                // It's crucial that this function receives only its relevant state slice,
                // but for simplicity in the main reducer, we pass the whole state and trust this function.
                return applyMutationValidated(state, event) as T;
        }
    }
    
    return state;
}
