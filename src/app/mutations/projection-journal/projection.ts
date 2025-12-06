
"use client";

import type { AppEvent, AppCommand, AppState, MutationType } from '../mutation-lifecycle/domain';
import { parse, format, min, max, isSameMonth, isBefore, isAfter } from 'date-fns';
import type { EcriturePeriodeCorrigeeEvent } from '../ecritures/corriger-periode-ecriture/event';

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
    correctedEcritures: number;
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
        correctedEcritures: 0,
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

function updateRessourcesDateRange(entry: JournalEntry, newDates: Date[]): Partial<JournalEntry> {
    if (newDates.length === 0) return {};
    
    const updates: Partial<JournalEntry> = {};

    const currentStart = entry.ressourcesDateDebut ? parse(entry.ressourcesDateDebut, 'MM-yyyy', new Date()) : null;
    const currentEnd = entry.ressourcesDateFin ? parse(entry.ressourcesDateFin, 'MM-yyyy', new Date()) : null;

    const newMinDate = min(newDates);
    const newMaxDate = max(newDates);

    if (!currentStart || newMinDate < currentStart) {
        updates.ressourcesDateDebut = format(newMinDate, 'MM-yyyy');
    }
    if (!currentEnd || newMaxDate > currentEnd) {
        updates.ressourcesDateFin = format(newMaxDate, 'MM-yyyy');
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
                const dateUpdates = updateRessourcesDateRange(entry, [dateDebut, dateFin]);
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
                const dateUpdates = updateRessourcesDateRange(entry, [dateDebut, dateFin]);
                return { ...entry, addedDepenses: entry.addedDepenses + 1, ...dateUpdates };
            }
            return entry;
        }),
    };
}

function applyEcritureSupprimee(state: JournalState, event: AppEvent, allEcritures: AppState['ecritures']): JournalState {
    if (event.type !== 'ECRITURE_SUPPRIMEE') return state;
    
    const deletedEcriture = allEcritures.find(e => e.id === event.payload.ecritureId);
    if (!deletedEcriture) return state;

    return {
        ...state,
        journal: state.journal.map(entry => {
            if (entry.mutationId === event.mutationId) {
                const dateDebut = parse(deletedEcriture.dateDebut, 'MM-yyyy', new Date());
                const dateFin = parse(deletedEcriture.dateFin, 'MM-yyyy', new Date());
                const dateUpdates = updateRessourcesDateRange(entry, [dateDebut, dateFin]);
                return { ...entry, deletedEcritures: entry.deletedEcritures + 1, ...dateUpdates };
            }
            return entry;
        }),
    };
}

function applyEcriturePeriodeCorrigee(state: JournalState, event: EcriturePeriodeCorrigeeEvent, allEcritures: AppState['ecritures']): JournalState {
    const originalEcriture = allEcritures.find(e => e.id === event.payload.ecritureId);
    if (!originalEcriture) return state;

    return {
        ...state,
        journal: state.journal.map(entry => {
            if (entry.mutationId === event.mutationId) {
                const originalStart = parse(originalEcriture.dateDebut, 'MM-yyyy', new Date());
                const originalEnd = parse(originalEcriture.dateFin, 'MM-yyyy', new Date());
                const newStart = parse(event.payload.dateDebut, 'MM-yyyy', new Date());
                const newEnd = parse(event.payload.dateFin, 'MM-yyyy', new Date());
                
                const affectedDates: Date[] = [];
                // Raccourcissement de la fin
                if (isBefore(newEnd, originalEnd)) affectedDates.push(originalEnd);
                // Raccourcissement du début
                if (isAfter(newStart, originalStart)) affectedDates.push(originalStart);
                // Extension de la fin
                if (isAfter(newEnd, originalEnd)) affectedDates.push(newEnd);
                // Extension du début
                if (isBefore(newStart, originalStart)) affectedDates.push(newStart);

                // Si complètement différent (pas de chevauchement)
                if (isAfter(newStart, originalEnd) || isBefore(newEnd, originalStart)) {
                    affectedDates.push(originalStart, originalEnd, newStart, newEnd);
                }

                if (affectedDates.length === 0 && !isSameMonth(originalStart, newStart) && !isSameMonth(originalEnd, newEnd)) {
                    // Fallback pour les cas complexes non couverts, comme un décalage simple
                     affectedDates.push(originalStart, originalEnd, newStart, newEnd);
                }
                
                const dateUpdates = updateRessourcesDateRange(entry, affectedDates);

                return { ...entry, correctedEcritures: entry.correctedEcritures + 1, ...dateUpdates };
            }
            return entry;
        }),
    };
}


// 3. Slice Reducer
export function journalProjectionReducer<T extends JournalState & { ecritures: AppState['ecritures'] }>(
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
                // We need the full ecritures list to know the date range of the deleted item
                nextState = applyEcritureSupprimee(state, event, state.ecritures);
                break;
             case 'ECRITURE_PERIODE_CORRIGEE':
                // We need the full ecritures list to get the original date range
                nextState = applyEcriturePeriodeCorrigee(state, event, state.ecritures);
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
