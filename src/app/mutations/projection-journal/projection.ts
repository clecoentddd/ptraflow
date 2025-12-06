
"use client";

import type { AppEvent, AppCommand, AppState, MutationType, Ecriture } from '../mutation-lifecycle/domain';
import { parse, format, min, max, eachMonthOfInterval, differenceInMonths } from 'date-fns';
import type { EcritureDateFinModifieeEvent } from '../ecritures/mettre-a-jour-ecriture/event';

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

// --- Full Rebuild Logic ---
// This function rebuilds the entire journal state from the final state of ecritures and events.
// It is the single source of truth for this projection.
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
    const findEcritureAtPoint = (ecritureId: string, beforeEventTimestamp: string): Ecriture | undefined => {
        let tempEcritures: Ecriture[] = [];
        for (const ev of sortedEvents) {
            if (new Date(ev.timestamp) >= new Date(beforeEventTimestamp)) break;
            
            if (ev.type === 'REVENU_AJOUTE' || ev.type === 'DEPENSE_AJOUTEE') {
                 tempEcritures.push({
                    id: ev.payload.ecritureId,
                    mutationId: ev.mutationId,
                    ressourceVersionId: ev.ressourceVersionId,
                    type: ev.type === 'REVENU_AJOUTE' ? 'revenu' : 'dépense',
                    ...ev.payload
                });
            } else if (ev.type === 'ECRITURE_SUPPRIMEE') {
                tempEcritures = tempEcritures.filter(e => e.id !== ev.payload.ecritureId);
            } else if (ev.type === 'ECRITURE_DATE_FIN_MODIFIEE') {
                tempEcritures = tempEcritures.map(e => 
                    e.id === ev.payload.ecritureId 
                    ? { ...e, dateFin: ev.payload.nouvelleDateFin }
                    : e
                );
            }
        }
        return tempEcritures.find(e => e.id === ecritureId);
    };

    for (const entry of journalMap.values()) {
        if (entry.mutationType !== 'RESSOURCES') continue;
        
        const affectedMonths = new Set<string>();

        const mutationEvents = sortedEvents.filter(e => e.mutationId === entry.mutationId);

        for (const event of mutationEvents) {
            if (event.type === 'REVENU_AJOUTE' || event.type === 'DEPENSE_AJOUTEE') {
                const start = parse(event.payload.dateDebut, 'MM-yyyy', new Date());
                const end = parse(event.payload.dateFin, 'MM-yyyy', new Date());
                eachMonthOfInterval({start, end}).forEach(d => affectedMonths.add(format(d, 'MM-yyyy')));
            } else if (event.type === 'ECRITURE_SUPPRIMEE') {
                 const originalEcriture = findEcritureAtPoint(event.payload.ecritureId, event.timestamp);
                 if (originalEcriture) {
                     const start = parse(originalEcriture.dateDebut, 'MM-yyyy', new Date());
                     const end = parse(originalEcriture.dateFin, 'MM-yyyy', new Date());
                     eachMonthOfInterval({start, end}).forEach(d => affectedMonths.add(format(d, 'MM-yyyy')));
                 }
            } else if (event.type === 'ECRITURE_DATE_FIN_MODIFIEE') {
                 const { ancienneDateFin, nouvelleDateFin } = event.payload;
                 const oldEnd = parse(ancienneDateFin, 'MM-yyyy', new Date());
                 const newEnd = parse(nouvelleDateFin, 'MM-yyyy', new Date());

                 if (newEnd > oldEnd) { // Extension
                    const start = new Date(oldEnd.getFullYear(), oldEnd.getMonth() + 1, 1);
                    eachMonthOfInterval({ start, end: newEnd }).forEach(d => affectedMonths.add(format(d, 'MM-yyyy')));
                 } else { // Raccourcissement
                    const start = new Date(newEnd.getFullYear(), newEnd.getMonth() + 1, 1);
                    eachMonthOfInterval({ start, end: oldEnd }).forEach(d => affectedMonths.add(format(d, 'MM-yyyy')));
                 }
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
export function journalProjectionReducer(state: AppState, eventOrCommand: AppEvent | AppCommand): AppState {
    // This projection is now simple: it always rebuilds itself from the full state.
    // It's called after all other projections have run.
    if (eventOrCommand.type === 'REPLAY' || eventOrCommand.type === 'REPLAY_COMPLETE') {
         const newJournalState = rebuildJournal(state);
         return { ...state, ...newJournalState };
    }

    return state;
}

// 4. Queries (Selectors)
export function queryJournal(state: AppState): JournalEntry[] {
    return [...state.journal].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
