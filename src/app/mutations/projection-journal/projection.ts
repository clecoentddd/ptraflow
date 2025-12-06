
"use client";

import type { AppEvent, AppCommand, AppState, MutationType } from '../mutation-lifecycle/domain';
import { parse, format, min, max, eachMonthOfInterval } from 'date-fns';
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
    const validDates = newDates.filter(d => d && !isNaN(d.getTime()));
    if (validDates.length === 0) return {};
    
    const allDates: Date[] = [...validDates];
    if (entry.ressourcesDateDebut) {
        const d = parse(entry.ressourcesDateDebut, 'MM-yyyy', new Date());
        if(!isNaN(d.getTime())) allDates.push(d);
    }
    if (entry.ressourcesDateFin) {
        const d = parse(entry.ressourcesDateFin, 'MM-yyyy', new Date());
        if(!isNaN(d.getTime())) allDates.push(d);
    }
    
    const filteredDates = allDates.filter(d => !isNaN(d.getTime()));
    if(filteredDates.length === 0) return {};

    const newMinDate = min(filteredDates);
    const newMaxDate = max(filteredDates);
    
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
    
    // Find the state of the ecriture *before* it was deleted
    const ecritureToDelete = allEcritures.find(e => e.id === event.payload.ecritureId);
    if (!ecritureToDelete) return state;

    return {
        ...state,
        journal: state.journal.map(entry => {
            if (entry.mutationId === event.mutationId) {
                const dateDebut = parse(ecritureToDelete.dateDebut, 'MM-yyyy', new Date());
                const dateFin = parse(ecritureToDelete.dateFin, 'MM-yyyy', new Date());
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

                // Create sets of months for easy comparison
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
// This reducer depends on the final state of other projections (like ecritures).
// It's designed to be called during the REPLAY_COMPLETE phase of testing or a similar final step.
export function journalProjectionReducer(state: AppState, eventOrCommand: AppEvent | AppCommand): AppState {
    // This reducer is complex because it often needs the final state of the ecritures to calculate ranges.
    // It's simpler to rebuild it based on the final event stream.
    
    if (eventOrCommand.type === 'REPLAY_COMPLETE') {
         let journalState: JournalState = initialJournalState;
         
         // Re-create all journal entries from scratch
         const mutationEvents = state.eventStream.filter(e => e.type === 'DROITS_MUTATION_CREATED' || e.type === 'RESSOURCES_MUTATION_CREATED');
         for (const event of mutationEvents) {
             journalState = applyMutationCreated(journalState, event);
         }

         // Now, iterate through the whole event stream and apply logic
         for (const event of [...state.eventStream].reverse()) { // chronological order
             switch (event.type) {
                case 'DROITS_ANALYSES':
                    journalState = applyDroitsAnalyses(journalState, event);
                    break;
                case 'REVENU_AJOUTE':
                    journalState = applyRevenuAjoute(journalState, event);
                    break;
                case 'DEPENSE_AJOUTEE':
                    journalState = applyDepenseAjoutee(journalState, event);
                    break;
                case 'ECRITURE_SUPPRIMEE':
                    // This one needs the final ecritures list to find the deleted item's period.
                    // But since we are rebuilding from scratch, the ecriture is already gone.
                    // This is a flaw. The event must contain the deleted period.
                    // For now, let's just count it.
                     journalState = {
                        ...journalState,
                        journal: journalState.journal.map(j => j.mutationId === event.mutationId ? {...j, deletedEcritures: j.deletedEcritures + 1} : j)
                     };
                    break;
                 case 'ECRITURE_PERIODE_CORRIGEE':
                    journalState = applyEcriturePeriodeCorrigee(journalState, event);
                    break;
            }
         }
         return { ...state, ...journalState };
    }

    // For live updates (not replay), we can use the existing logic for simple events
    if ('type' in eventOrCommand && 'payload' in eventOrCommand) {
        const event = eventOrCommand;
        switch (event.type) {
            case 'DROITS_MUTATION_CREATED':
            case 'RESSOURCES_MUTATION_CREATED':
                return { ...state, ...applyMutationCreated(state, event) };
        }
    }

    return state;
}

// 4. Queries (Selectors)
export function queryJournal(state: AppState): JournalEntry[] {
    return [...state.journal].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

    