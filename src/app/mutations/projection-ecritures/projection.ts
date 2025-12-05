
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

// 4. Queries (Selectors)

// Returns ALL ecritures from the state
export function queryAllEcritures(state: AppState): Ecriture[] {
    // Sort by timestamp from the related event for chronological order
    const eventMap = new Map(state.eventStream.map(e => [e.id, e.timestamp]));
    return [...state.ecritures].sort((a, b) => {
         const eventA = state.eventStream.find(e => (e.type === 'REVENU_AJOUTE' || e.type === 'DEPENSE_AJOUTEE') && e.payload.ecritureId === a.id);
         const eventB = state.eventStream.find(e => (e.type === 'REVENU_AJOUTE' || e.type === 'DEPENSE_AJOUTEE') && e.payload.ecritureId === b.id);
         const timeA = eventA ? new Date(eventA.timestamp).getTime() : 0;
         const timeB = eventB ? new Date(eventB.timestamp).getTime() : 0;
         return timeB - timeA; // most recent first
    });
}


// Returns ecritures for a specific ressourceVersionId
export function queryEcrituresForRessourceVersion(state: AppState, ressourceVersionId: string): Ecriture[] {
    return state.ecritures.filter(e => e.ressourceVersionId === ressourceVersionId);
}
