
"use client";

import type { AppEvent, AppCommand, AppState, MutationType } from '../mutation-lifecycle/domain';
import { parse, format, min, max } from 'date-fns';

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


// Helper to update the date range of a journal entry
function updateRessourcesDateRange(entry: JournalEntry | undefined, newDates: Date[]): Partial<JournalEntry> {
    if (!entry) return {};
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


// --- Full Rebuild Logic ---
// This function rebuilds the entire journal state from the event stream.
// It is the single source of truth for this projection.
function rebuildJournal(state: AppState): JournalState {
    const journalMap = new Map<string, JournalEntry>();

    const sortedEvents = [...state.eventStream].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (const event of sortedEvents) {
        // --- 1. Create entry if it doesn't exist ---
        if ((event.type === 'DROITS_MUTATION_CREATED' || event.type === 'RESSOURCES_MUTATION_CREATED') && !journalMap.has(event.mutationId)) {
            journalMap.set(event.mutationId, {
                mutationId: event.mutationId,
                mutationType: event.payload.mutationType,
                timestamp: event.timestamp,
            });
        }

        const entry = journalMap.get(event.mutationId);
        if (!entry) continue;

        // --- 2. Update entry based on event type ---
        switch (event.type) {
            case 'DROITS_ANALYSES':
                entry.droitsDateDebut = event.payload.dateDebut;
                entry.droitsDateFin = event.payload.dateFin;
                break;
            
            case 'REVENU_AJOUTE':
            case 'DEPENSE_AJOUTEE': {
                const dateDebut = parse(event.payload.dateDebut, 'MM-yyyy', new Date());
                const dateFin = parse(event.payload.dateFin, 'MM-yyyy', new Date());
                const dateUpdates = updateRessourcesDateRange(entry, [dateDebut, dateFin]);
                Object.assign(entry, dateUpdates);
                break;
            }
                
            case 'ECRITURE_SUPPRIMEE': {
                // Find the ecriture in its original state (before deletion)
                 const originalEcriture = state.ecritures.find(e => e.id === event.payload.ecritureId);
                 if (originalEcriture) {
                     const dateDebut = parse(originalEcriture.dateDebut, 'MM-yyyy', new Date());
                     const dateFin = parse(originalEcriture.dateFin, 'MM-yyyy', new Date());
                     const dateUpdates = updateRessourcesDateRange(entry, [dateDebut, dateFin]);
                     Object.assign(entry, dateUpdates);
                 }
                break;
            }
        }
    }
    return { journal: Array.from(journalMap.values()) };
}

// 3. Slice Reducer
export function journalProjectionReducer(state: AppState, eventOrCommand: AppEvent | AppCommand): AppState {
    // This projection is now simple: it always rebuilds itself from the full state.
    // It's called after all other projections have run.
    if (eventOrCommand.type === 'REPLAY_COMPLETE') {
         const newJournalState = rebuildJournal(state);
         return { ...state, ...newJournalState };
    }
    
    // During live updates, we can also trigger a rebuild.
    // This is not the most performant, but it guarantees consistency in this architecture.
     if ('type' in eventOrCommand && 'payload' in eventOrCommand) {
        return { ...state, ...rebuildJournal(state) };
     }

    return state;
}

// 4. Queries (Selectors)
export function queryJournal(state: AppState): JournalEntry[] {
    return [...state.journal].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
