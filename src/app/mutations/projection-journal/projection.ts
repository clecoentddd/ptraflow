
"use client";

import type { AppEvent, AppCommand, AppState, MutationType } from '../mutation-lifecycle/domain';
import { parse, format } from 'date-fns';

// 1. State Slice and Initial State
export interface JournalEntry {
    mutationId: string;
    mutationType: MutationType;
    timestamp: string;
    // For DROITS mutations
    droitsDateDebut?: string;
    droitsDateFin?: string;
    // For RESSOURCES mutations
    addedRevenus: number;
    addedDepenses: number;
    deletedEcritures: number;
    ressourcesDateDebut?: string; // min date
    ressourcesDateFin?: string; // max date
}

export interface JournalState {
  journal: JournalEntry[];
}

export const initialJournalState: JournalState = {
  journal: [],
};


// 2. Projection Logic

function applyMutationCreated(state: JournalState, event: AppEvent): JournalState {
    if (event.type !== 'DROITS_MUTATION_CREATED' && event.type !== 'RESSOURCES_MUTATION_CREATED') return state;
    
    const existingEntry = state.journal.find(entry => entry.mutationId === event.mutationId);
    if (existingEntry) return state; // Already exists

    const newEntry: JournalEntry = {
        mutationId: event.mutationId,
        mutationType: event.payload.mutationType,
        timestamp: event.timestamp,
        addedRevenus: 0,
        addedDepenses: 0,
        deletedEcritures: 0,
    };
    return { ...state, journal: [newEntry, ...state.journal] };
}

function applyDroitsAnalyses(state: JournalState, event: AppEvent): JournalState {
    if (event.type !== 'DROITS_ANALYSES') return state;

    return {
        ...state,
        journal: state.journal.map(entry =>
            entry.mutationId === event.mutationId
                ? { ...entry, droitsDateDebut: event.payload.dateDebut, droitsDateFin: event.payload.dateFin }
                : entry
        ),
    };
}

function updateRessourcesDateRange(entry: JournalEntry, newStartDate: Date, newEndDate: Date): Partial<JournalEntry> {
    const updates: Partial<JournalEntry> = {};

    const currentStart = entry.ressourcesDateDebut ? parse(entry.ressourcesDateDebut, 'MM-yyyy', new Date()) : null;
    const currentEnd = entry.ressourcesDateFin ? parse(entry.ressourcesDateFin, 'MM-yyyy', new Date()) : null;

    if (!currentStart || newStartDate < currentStart) {
        updates.ressourcesDateDebut = format(newStartDate, 'MM-yyyy');
    }
    if (!currentEnd || newEndDate > currentEnd) {
        updates.ressourcesDateFin = format(newEndDate, 'MM-yyyy');
    }

    return updates;
}


function applyRevenuAjoute(state: JournalState, event: AppEvent): JournalState {
    if (event.type !== 'REVENU_AJOUTE') return state;
    
    return {
        ...state,
        journal: state.journal.map(entry => {
            if (entry.mutationId === event.mutationId) {
                const dateDebut = parse(event.payload.dateDebut, 'MM-yyyy', new Date());
                const dateFin = parse(event.payload.dateFin, 'MM-yyyy', new Date());
                const dateUpdates = updateRessourcesDateRange(entry, dateDebut, dateFin);
                return { ...entry, addedRevenus: entry.addedRevenus + 1, ...dateUpdates };
            }
            return entry;
        }),
    };
}

function applyDepenseAjoutee(state: JournalState, event: AppEvent): JournalState {
    if (event.type !== 'DEPENSE_AJOUTEE') return state;
    
    return {
        ...state,
        journal: state.journal.map(entry => {
            if (entry.mutationId === event.mutationId) {
                const dateDebut = parse(event.payload.dateDebut, 'MM-yyyy', new Date());
                const dateFin = parse(event.payload.dateFin, 'MM-yyyy', new Date());
                const dateUpdates = updateRessourcesDateRange(entry, dateDebut, dateFin);
                return { ...entry, addedDepenses: entry.addedDepenses + 1, ...dateUpdates };
            }
            return entry;
        }),
    };
}

function applyEcritureSupprimee(state: JournalState, event: AppEvent): JournalState {
    if (event.type !== 'ECRITURE_SUPPRIMEE') return state;
    // Note: This event doesn't carry date info. Recalculating the whole range would be inefficient.
    // The current approach assumes the date range only expands or stays the same.
    // To handle shrinking, we would need to re-scan all related events on deletion.
    return {
        ...state,
        journal: state.journal.map(entry =>
            entry.mutationId === event.mutationId
                ? { ...entry, deletedEcritures: entry.deletedEcritures + 1 }
                : entry
        ),
    };
}


// 3. Slice Reducer
export function journalProjectionReducer<T extends JournalState>(
    state: T, 
    eventOrCommand: AppEvent | AppCommand
): T {
    if ('type' in eventOrCommand && 'payload' in eventOrCommand) {
        const event = eventOrCommand;
        let nextState = state;
        
        switch (event.type) {
            case 'DROITS_MUTATION_CREATED':
            case 'RESSOURCES_MUTATION_CREATED':
                nextState = applyMutationCreated(state, event);
                break;
            case 'DROITS_ANALYSES':
                nextState = applyDroitsAnalyses(state, event);
                break;
            case 'REVENU_AJOUTE':
                nextState = applyRevenuAjoute(state, event);
                break;
            case 'DEPENSE_AJOUTEE':
                nextState = applyDepenseAjoutee(state, event);
                break;
            case 'ECRITURE_SUPPRIMEE':
                nextState = applyEcritureSupprimee(state, event);
                break;
        }
        return nextState as T;
    }
    return state;
}

// 4. Queries (Selectors)
export function queryJournal(state: AppState): JournalEntry[] {
    return [...state.journal].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
