
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

// --- Full Rebuild Logic ---
// This function rebuilds the entire journal state from the final state of ecritures and events.
function rebuildJournal(state: AppState): JournalState {
    const journalMap = new Map<string, JournalEntry>();

    const sortedEvents = [...state.eventStream].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // First pass: create journal entries and handle DROITS mutations
    for (const event of sortedEvents) {
        if ((event.type === 'DROITS_MUTATION_CREATED' || event.type === 'RESSOURCES_MUTATION_CREATED') && !journalMap.has(event.mutationId)) {
            journalMap.set(event.mutationId, {
                mutationId: event.mutationId,
                mutationType: event.payload.mutationType,
                timestamp: event.timestamp,
            });
        }
        const entry = journalMap.get(event.mutationId);
        if (!entry) continue;

        if (event.type === 'DROITS_ANALYSES') {
            entry.droitsDateDebut = event.payload.dateDebut;
            entry.droitsDateFin = event.payload.dateFin;
        }
    }
    
    // --- Second pass: determine RESSOURCES modification periods ---
    for (const entry of journalMap.values()) {
        if (entry.mutationType !== 'RESSOURCES') continue;
        
        const affectedMonths = new Set<string>();
        const mutationEvents = sortedEvents.filter(e => e.mutationId === entry.mutationId);

        for (const event of mutationEvents) {
            // Case 1: Simple add or delete. The full period is affected.
            if (event.type === 'REVENU_AJOUTE' || event.type === 'DEPENSE_AJOUTEE') {
                const start = parse(event.payload.dateDebut, 'MM-yyyy', new Date());
                const end = parse(event.payload.dateFin, 'MM-yyyy', new Date());
                eachMonthOfInterval({start, end}).forEach(d => affectedMonths.add(format(d, 'MM-yyyy')));
            } else if (event.type === 'ECRITURE_SUPPRIMEE') {
                 // The 'replace' pattern (delete+add) is treated as a single logical operation
                 // We need to find the ecriture state *before* it was deleted
                 const originalEcriture = state.ecritures.find(e => e.id === event.payload.ecritureId);
                 if (originalEcriture) { // Should exist if it's a replace
                     const start = parse(originalEcriture.dateDebut, 'MM-yyyy', new Date());
                     const end = parse(originalEcriture.dateFin, 'MM-yyyy', new Date());
                     eachMonthOfInterval({start, end}).forEach(d => affectedMonths.add(format(d, 'MM-yyyy')));
                 }
            } else if (event.type === 'ECRITURE_PERIODE_CORRIGEE') {
                // Case 2: A period was corrected. Use symmetric difference.
                const diffMonths = getSymmetricDifferenceMonths(event.payload);
                diffMonths.forEach(m => affectedMonths.add(m));
            }
        }

        if (affectedMonths.size > 0) {
            const allDates = Array.from(affectedMonths.values()).map(m => parse(m, 'MM-yyyy', new Date()));
            const minDate = min(allDates);
            const maxDate = max(allDates);
            entry.ressourcesDateDebut = format(minDate, 'MM-yyyy');
            entry.ressourcesDateFin = format(maxDate, 'MM-yyyy');
        }
    }

    return { journal: Array.from(journalMap.values()) };
}

// 3. Slice Reducer
export function journalProjectionReducer(state: AppState): AppState {
    const newJournalState = rebuildJournal(state);
    return { ...state, ...newJournalState };
}

// 4. Queries (Selectors)
export function queryJournal(state: AppState): JournalEntry[] {
    return [...state.journal].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
