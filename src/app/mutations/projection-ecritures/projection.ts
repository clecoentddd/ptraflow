"use client";

import type { AppEvent, AppCommand, AppState, Ecriture } from '../mutation-lifecycle/domain';

// 1. State Slice and Initial State
export interface EcrituresState {
  ecritures: Ecriture[];
}

export const initialEcrituresState: EcrituresState = {
  ecritures: [],
};


// 2. Projection Logic for this Slice
function applyRevenuAjoute(state: EcrituresState, event: AppEvent): EcrituresState {
    if (event.type !== 'REVENU_AJOUTE') return state;
    const newEcriture: Ecriture = {
        id: event.payload.ecritureId,
        mutationId: event.mutationId,
        ressourceVersionId: event.ressourceVersionId,
        type: 'revenu',
        ...event.payload
    };
    return { ...state, ecritures: [...state.ecritures, newEcriture] };
}

function applyDepenseAjoutee(state: EcrituresState, event: AppEvent): EcrituresState {
    if (event.type !== 'DEPENSE_AJOUTEE') return state;
     const newEcriture: Ecriture = {
        id: event.payload.ecritureId,
        mutationId: event.mutationId,
        ressourceVersionId: event.ressourceVersionId,
        type: 'dépense',
        ...event.payload
    };
    return { ...state, ecritures: [...state.ecritures, newEcriture] };
}

function applyEcritureSupprimee(state: EcrituresState, event: AppEvent): EcrituresState {
    if (event.type !== 'ECRITURE_SUPPRIMEE') return state;
    return {
        ...state,
        ecritures: state.ecritures.filter(e => e.id !== event.payload.ecritureId)
    };
}


// 3. Slice Reducer
export function ecrituresProjectionReducer<T extends EcrituresState>(
    state: T, 
    eventOrCommand: AppEvent | AppCommand
): T {
     if ('type' in eventOrCommand && 'payload' in eventOrCommand) {
        const event = eventOrCommand;
        switch (event.type) {
            case 'REVENU_AJOUTE':
                return applyRevenuAjoute(state, event) as T;
            case 'DEPENSE_AJOUTEE':
                return applyDepenseAjoutee(state, event) as T;
            case 'ECRITURE_SUPPRIMEE':
                return applyEcritureSupprimee(state, event) as T;
        }
    }
    return state;
}

// 4. Query (Selector)
export function queryEcritures(state: AppState, ressourceVersionId: string): Ecriture[] {
    return state.ecritures.filter(e => e.ressourceVersionId === ressourceVersionId);
}
