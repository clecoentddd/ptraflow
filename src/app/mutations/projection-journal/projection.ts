

"use client";

import type { AppEvent, AppCommand, AppState, MutationType, Ecriture } from '../mutation-lifecycle/domain';
import { parse, format, min, max, eachMonthOfInterval, differenceInMonths } from 'date-fns';
import type { EcriturePeriodeCorrigeeEvent } from '../ecritures/mettre-a-jour-ecriture/event';

// 1. State Slice and Initial State
export interface JournalEntry {
    mutationId: string;
    mutationType: MutationType;
    timestamp: string;
    // For DROITS mutations
    droitsDateDebut?: string;
    droitsDateFin?: string;
    // For RESSOURCES mutations
    ressourcesDateDebut?: string; // min date of all modified ecritures
    ressourcesDateFin?: string; // max date of all modified ecritures
}

export interface JournalState {
  journal: JournalEntry[];
}

export const initialJournalState: JournalState = {
  journal: [],
};

// --- Helper to get the set of affected months for the symmetric difference ---
function getSymmetricDifferenceMonths(payload: EcriturePeriodeCorrigeeEvent['payload']): Set<string> {
    const oldStart = parse(payload.originalDateDebut, 'MM-yyyy', new Date());
    const oldEnd = parse(payload.originalDateFin, 'MM-yyyy', new Date());
    const newStart = parse(payload.newDateDebut, 'MM-yyyy', new Date());
    const newEnd = parse(payload.newDateFin, 'MM-yyyy', new Date());
    
    if (isNaN(oldStart.getTime()) || isNaN(oldEnd.getTime()) || isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
        return new Set();
    }

    const oldMonths = new Set(eachMonthOfInterval({ start: oldStart, end: oldEnd }).map(d => format(d, 'MM-yyyy')));
    const newMonths = new Set(eachMonthOfInterval({ start: newStart, end: newEnd }).map(d => format(d, 'MM-yyyy')));

    const difference = new Set<string>();
    oldMonths.forEach(m => {
        if (!newMonths.has(m)) {
            difference.add(m);
        }
    });
    newMonths.forEach(m => {
        if (!oldMonths.has(m)) {
            difference.add(m);
        }
    });
    return difference;
}

const getOrCreateEntry = (state: JournalState, event: AppEvent): { newState: JournalState, entry: JournalEntry } => {
    let entry = state.journal.find(j => j.mutationId === event.mutationId);
    if (entry) {
        return { newState: state, entry };
    }

    // It should have been created by DROITS_MUTATION_CREATED or RESSOURCES_MUTATION_CREATED
    // This is a safeguard, but the logic should ensure this doesn't happen.
    // We'll create it on the fly if needed.
    const mutationCreationEvent = (event as any); // a bit of a hack for typing
    entry = {
        mutationId: event.mutationId,
        mutationType: mutationCreationEvent.payload.mutationType,
        timestamp: event.timestamp,
    };
    const newState = { ...state, journal: [...state.journal, entry] };
    return { newState, entry };
};

// 3. Slice Reducer
export function journalProjectionReducer(state: AppState, event: AppEvent): AppState {
    
    let entry: JournalEntry | undefined;
    let newJournal = [...state.journal];

    const updateEntry = (mutationId: string, updates: Partial<JournalEntry>) => {
        let found = false;
        newJournal = newJournal.map(e => {
            if (e.mutationId === mutationId) {
                found = true;
                return { ...e, ...updates };
            }
            return e;
        });
        if (!found && 'mutationType' in updates) {
             newJournal.push({
                mutationId: mutationId,
                timestamp: event.timestamp,
                ...updates,
            } as JournalEntry);
        }
    };


    switch(event.type) {
        case 'DROITS_MUTATION_CREATED':
        case 'RESSOURCES_MUTATION_CREATED':
            updateEntry(event.mutationId, { mutationType: event.payload.mutationType });
            break;

        case 'DROITS_ANALYSES':
            updateEntry(event.mutationId, {
                droitsDateDebut: event.payload.dateDebut,
                droitsDateFin: event.payload.dateFin,
            });
            break;

        case 'REVENU_AJOUTE':
        case 'DEPENSE_AJOUTEE': {
            entry = newJournal.find(j => j.mutationId === event.mutationId);
            if (!entry || entry.mutationType !== 'RESSOURCES') break;
            
            const newDates = [parse(event.payload.dateDebut, 'MM-yyyy', new Date()), parse(event.payload.dateFin, 'MM-yyyy', new Date())];
            if(entry.ressourcesDateDebut) newDates.push(parse(entry.ressourcesDateDebut, 'MM-yyyy', new Date()));
            if(entry.ressourcesDateFin) newDates.push(parse(entry.ressourcesDateFin, 'MM-yyyy', new Date()));

            const minDate = min(newDates);
            const maxDate = max(newDates);
            
            updateEntry(event.mutationId, {
                ressourcesDateDebut: format(minDate, 'MM-yyyy'),
                ressourcesDateFin: format(maxDate, 'MM-yyyy'),
            });
            break;
        }

        case 'ECRITURE_SUPPRIMEE': {
            // Deleting an ecriture is like a 'replace' with nothing.
            // The journal must expand to include the entire period of the deleted item.
            entry = newJournal.find(j => j.mutationId === event.mutationId);
            const originalEcriture = state.ecritures.find(e => e.id === event.payload.ecritureId);

            if (!entry || !originalEcriture || entry.mutationType !== 'RESSOURCES') break;

            const existingDates: Date[] = [];
            if(entry.ressourcesDateDebut) existingDates.push(parse(entry.ressourcesDateDebut, 'MM-yyyy', new Date()));
            if(entry.ressourcesDateFin) existingDates.push(parse(entry.ressourcesDateFin, 'MM-yyyy', new Date()));
            existingDates.push(parse(originalEcriture.dateDebut, 'MM-yyyy', new Date()));
            existingDates.push(parse(originalEcriture.dateFin, 'MM-yyyy', new Date()));
            
            const minDate = min(existingDates);
            const maxDate = max(existingDates);

             updateEntry(event.mutationId, {
                ressourcesDateDebut: format(minDate, 'MM-yyyy'),
                ressourcesDateFin: format(maxDate, 'MM-yyyy'),
            });
            break;
        }

        case 'ECRITURE_PERIODE_CORRIGEE': {
             entry = newJournal.find(j => j.mutationId === event.mutationId);
             if (!entry || entry.mutationType !== 'RESSOURCES') break;

             const diffMonths = getSymmetricDifferenceMonths(event.payload);
             if (diffMonths.size === 0) break;

             const affectedDates = Array.from(diffMonths).map(m => parse(m, 'MM-yyyy', new Date()));
             if (entry.ressourcesDateDebut) affectedDates.push(parse(entry.ressourcesDateDebut, 'MM-yyyy', new Date()));
             if (entry.ressourcesDateFin) affectedDates.push(parse(entry.ressourcesDateFin, 'MM-yyyy', new Date()));

             const minDate = min(affectedDates);
             const maxDate = max(affectedDates);

             updateEntry(event.mutationId, {
                ressourcesDateDebut: format(minDate, 'MM-yyyy'),
                ressourcesDateFin: format(maxDate, 'MM-yyyy'),
            });
            break;
        }
    }
    
    return { ...state, journal: newJournal };
}


// 4. Queries (Selectors)
export function queryJournal(state: AppState): JournalEntry[] {
    return [...state.journal].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
