
"use client";

import type { AppEvent, AppCommand, AppState, MutationType } from '../mutation-lifecycle/domain';
import { parse, format, min, max, isSameMonth, isBefore, isAfter, eachMonthOfInterval } from 'date-fns';
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
    
    const validDates = newDates.filter(d => !isNaN(d.getTime()));
    if (validDates.length === 0) return {};

    const allDates = [...validDates];
    if (entry.ressourcesDateDebut) allDates.push(parse(entry.ressourcesDateDebut, 'MM-yyyy', new Date()));
    if (entry.ressourcesDateFin) allDates.push(parse(entry.ressourcesDateFin, 'MM-yyyy', new Date()));

    const newMinDate = min(allDates.filter(d => !isNaN(d.getTime())));
    const newMaxDate = max(allDates.filter(d => !isNaN(d.getTime())));
    
    return {
        ressourcesDateDebut: format(newMinDate, 'MM-yyyy'),
        ressourcesDateFin: format(newMaxDate, 'MM-yyyy'),
    };
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

function applyEcriturePeriodeCorrigee(state: JournalState, event: EcriturePeriodeCorrigeeEvent): JournalState {
    return {
        ...state,
        journal: state.journal.map(entry => {
            if (entry.mutationId === event.mutationId) {
                
                const originalStart = parse(event.payload.originalDateDebut, 'MM-yyyy', new Date());
                const originalEnd = parse(event.payload.originalDateFin, 'MM-yyyy', new Date());
                const newStart = parse(event.payload.newDateDebut, 'MM-yyyy', new Date());
                const newEnd = parse(event.payload.newDateFin, 'MM-yyyy', new Date());

                // If dates are invalid, the corrected period is the full original period.
                if (newStart > newEnd) {
                    const dateUpdates = updateRessourcesDateRange(entry, [originalStart, originalEnd]);
                    return { ...entry, correctedEcritures: entry.correctedEcritures + 1, ...dateUpdates };
                }

                const originalMonths = new Set(eachMonthOfInterval({ start: originalStart, end: originalEnd }).map(d => format(d, 'MM-yyyy')));
                const newMonths = new Set(eachMonthOfInterval({ start: newStart, end: newEnd }).map(d => format(d, 'MM-yyyy')));
                
                const affectedMonthsDates: Date[] = [];
                
                // Symmetric difference: months in one set but not the other.
                originalMonths.forEach(m => {
                    if (!newMonths.has(m)) {
                        affectedMonthsDates.push(parse(m, 'MM-yyyy', new Date()));
                    }
                });
                newMonths.forEach(m => {
                    if (!originalMonths.has(m)) {
                         affectedMonthsDates.push(parse(m, 'MM-yyyy', new Date()));
                    }
                });
                
                const dateUpdates = updateRessourcesDateRange(entry, affectedMonthsDates);
                
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
                // We need the original period from the payload. No need for the ecritures state.
                nextState = applyEcriturePeriodeCorrigee(state, event);
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
