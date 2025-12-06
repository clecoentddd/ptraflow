
"use client";

import type { AppEvent, AppCommand, AppState, Ecriture } from '../mutation-lifecycle/domain';
import { parse, eachMonthOfInterval, format, differenceInCalendarMonths } from 'date-fns';
import type { EcriturePeriodeCorrigeeEvent } from '../ecritures/corriger-periode-ecriture/event';

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

function applyEcriturePeriodeCorrigee(state: EcrituresState, event: EcriturePeriodeCorrigeeEvent): EcrituresState {
    return {
        ...state,
        ecritures: state.ecritures.map(e => 
            e.id === event.payload.ecritureId
                ? { ...e, dateDebut: event.payload.newDateDebut, dateFin: event.payload.newDateFin }
                : e
        )
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
            case 'ECRITURE_PERIODE_CORRIGEE':
                return applyEcriturePeriodeCorrigee(state, event) as T;
        }
    }
    return state;
}

// 4. Queries (Selectors)

// Pivots the ecritures data to a monthly view
export function queryEcrituresByMonth(state: AppState): {
    months: string[];
    rows: { ecriture: Ecriture; monthlyAmounts: Record<string, number> }[];
} {
    if (state.ecritures.length === 0) {
        return { months: [], rows: [] };
    }

    // Get all unique months across all ecritures
    const allMonths = new Set<string>();
    state.ecritures.forEach(e => {
        const start = parse(e.dateDebut, 'MM-yyyy', new Date());
        const end = parse(e.dateFin, 'MM-yyyy', new Date());
        if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return; // Ignore invalid data
        const interval = eachMonthOfInterval({ start, end });
        interval.forEach(monthDate => {
            allMonths.add(format(monthDate, 'MM-yyyy'));
        });
    });

    const sortedMonths = Array.from(allMonths).sort((a, b) => {
        const dateA = parse(a, 'MM-yyyy', new Date()).getTime();
        const dateB = parse(b, 'MM-yyyy', new Date()).getTime();
        return dateA - dateB;
    });

    // Build rows for the pivot table
    const rows = state.ecritures.map(ecriture => {
        const monthlyAmounts: Record<string, number> = {};
        const start = parse(ecriture.dateDebut, 'MM-yyyy', new Date());
        const end = parse(ecriture.dateFin, 'MM-yyyy', new Date());
        
        if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
            const interval = eachMonthOfInterval({ start, end });
            interval.forEach(monthDate => {
                const monthKey = format(monthDate, 'MM-yyyy');
                const amount = ecriture.type === 'dépense' ? -ecriture.montant : ecriture.montant;
                monthlyAmounts[monthKey] = (monthlyAmounts[monthKey] || 0) + amount;
            });
        }

        return { ecriture, monthlyAmounts };
    }).sort((a,b) => a.ecriture.code.localeCompare(b.ecriture.code));

    return { months: sortedMonths, rows };
}
