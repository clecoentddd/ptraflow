
"use client";

import type { AppEvent, AppCommand, AppState, MutationType, Ecriture } from '../mutation-lifecycle/domain';
import { parse, format, min, max, eachMonthOfInterval, differenceInMonths } from 'date-fns';

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
// This function rebuilds the entire journal state from the final state of ecritures.
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

    // Second pass: determine RESSOURCES modification periods by comparing snapshots.
    // We group all ecriture-related events by mutation.
    const ecritureEventsByMutation = new Map<string, AppEvent[]>();
    for (const event of sortedEvents) {
        if('ressourceVersionId' in event) {
            if(!ecritureEventsByMutation.has(event.mutationId)) {
                ecritureEventsByMutation.set(event.mutationId, []);
            }
            ecritureEventsByMutation.get(event.mutationId)?.push(event);
        }
    }
    
    for (const [mutationId, events] of ecritureEventsByMutation.entries()) {
        const entry = journalMap.get(mutationId);
        if (!entry || entry.mutationType !== 'RESSOURCES') continue;

        const affectedMonths = new Set<Date>();
        
        // Project ecritures at the beginning and end of this mutation's events
        const findEcritureAtPoint = (ecritureId: string, beforeEvent: AppEvent): Ecriture | undefined => {
            let tempEcritures: Ecriture[] = [];
            for (const ev of sortedEvents) {
                if(new Date(ev.timestamp) >= new Date(beforeEvent.timestamp)) break;
                
                if(ev.type === 'REVENU_AJOUTE' || ev.type === 'DEPENSE_AJOUTEE') {
                     tempEcritures.push({
                        id: ev.payload.ecritureId,
                        mutationId: ev.mutationId,
                        ressourceVersionId: ev.ressourceVersionId,
                        type: ev.type === 'REVENU_AJOUTE' ? 'revenu' : 'dépense',
                        ...ev.payload
                    });
                } else if(ev.type === 'ECRITURE_SUPPRIMEE') {
                    tempEcritures = tempEcritures.filter(e => e.id !== ev.payload.ecritureId);
                }
            }
            return tempEcritures.find(e => e.id === ecritureId);
        }
        
        const finalEcrituresForMutation = new Map<string, Ecriture>();
        events.forEach(event => {
             if(event.type === 'REVENU_AJOUTE' || event.type === 'DEPENSE_AJOUTEE') {
                finalEcrituresForMutation.set(event.payload.ecritureId, {
                    id: event.payload.ecritureId,
                    mutationId: event.mutationId,
                    ressourceVersionId: event.ressourceVersionId,
                    type: event.type === 'REVENU_AJOUTE' ? 'revenu' : 'dépense',
                    ...event.payload
                });
             } else if (event.type === 'ECRITURE_SUPPRIMEE') {
                finalEcrituresForMutation.delete(event.payload.ecritureId);
             }
        })
        
        // This is simplified: in a real scenario, we'd need a more robust way
        // to check what the "impact" of a change was.
        // For this BDD, we'll just union all periods of ecritures touched in the mutation.
        events.forEach(event => {
             if (event.type === 'REVENU_AJOUTE' || event.type === 'DEPENSE_AJOUTEE') {
                const start = parse(event.payload.dateDebut, 'MM-yyyy', new Date());
                const end = parse(event.payload.dateFin, 'MM-yyyy', new Date());
                eachMonthOfInterval({start, end}).forEach(d => affectedMonths.add(d));
            } else if (event.type === 'ECRITURE_SUPPRIMEE') {
                 // To find the period of a deleted ecriture, we must replay events until that point
                 const originalEcriture = findEcritureAtPoint(event.payload.ecritureId, event);
                 if (originalEcriture) {
                     const start = parse(originalEcriture.dateDebut, 'MM-yyyy', new Date());
                     const end = parse(originalEcriture.dateFin, 'MM-yyyy', new Date());
                     eachMonthOfInterval({start, end}).forEach(d => affectedMonths.add(d));
                 }
            }
        })

        if (affectedMonths.size > 0) {
            const allDates = Array.from(affectedMonths.values());
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
