
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
        // This is the business rule: always overwrite with the latest validated period.
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
                return applyMutationValidated(state, event);
        }
    }
    // Reset state for new replays if needed, though for a "latest only" slice it's not strictly necessary.
    if(eventOrCommand.type === 'REPLAY' && state.validatedPeriods.length > 0 && eventOrCommand.event.type === 'DROITS_MUTATION_CREATED') {
        // This is a simplistic way to handle replay, might need more robust logic
    }
    
    return state;
}
