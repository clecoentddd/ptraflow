
"use client";

import type { AppEvent, AppCommand, AppState, MutationType } from '../mutation-lifecycle/domain';
import type { MonthlyResult } from '../shared/plan-de-calcul.service';
import { queryTransactions } from '../projection-transactions/projection';
import { parse, format, eachMonthOfInterval, min, max } from 'date-fns';
import type { DecisionPreparteeEvent } from '../preparer-decision/event';
import type { DecisionDroitsPrepareeEvent } from '../preparer-decision-droits/event';
import type { DecisionRessourcesPrepareeEvent } from '../preparer-decision-ressources/event';

// 1. State Slice and Initial State
export interface DecisionData {
    decisionId: string;
    mutationId: string;
    calculId: string;
    ressourceVersionId: string;
    planDePaiementId: string | null;
    mutationType: MutationType;
    periodeDroits?: { dateDebut: string; dateFin: string };
    periodeModifications?: { dateDebut: string; dateFin: string };
    detail: (MonthlyResult & { paiementsEffectues: number; aPayer: number })[];
}

export interface DecisionAPrendreState {
  decisions: DecisionData[];
}

export const initialDecisionAPrendreState: DecisionAPrendreState = {
  decisions: [],
};


// 2. Projection Logic
function applyDecisionPrepartee(state: DecisionAPrendreState, event: DecisionPreparteeEvent | DecisionDroitsPrepareeEvent | DecisionRessourcesPrepareeEvent): DecisionAPrendreState {
    const newDecision: DecisionData = {
        mutationId: event.mutationId,
        ...event.payload
    };

    // Remove any existing decision for this mutation to ensure we only have the latest one.
    const otherDecisions = state.decisions.filter(d => d.mutationId !== event.mutationId);
    
    return {
        ...state,
        decisions: [...otherDecisions, newDecision]
    };
}

function applyDecisionValidee(state: DecisionAPrendreState, event: AppEvent): DecisionAPrendreState {
    if (event.type !== 'DECISION_VALIDEE') return state;

    // When a decision is validated, it's no longer "à prendre". We remove it from the list.
    return {
        ...state,
        decisions: state.decisions.filter(d => d.decisionId !== (event as any).payload.decisionId)
    };
}

function applyMutationAnnulee(state: DecisionAPrendreState, event: AppEvent): DecisionAPrendreState {
    if (event.type !== 'MUTATION_ANNULEE') return state;
    return {
        ...state,
        decisions: state.decisions.filter(d => d.mutationId !== event.mutationId)
    };
}


// 3. Slice Reducer
export function decisionAPrendreProjectionReducer(state: AppState, commandOrEvent: AppCommand | AppEvent): AppState {
    if ('type' in commandOrEvent && 'payload' in commandOrEvent) {
        const event = commandOrEvent as AppEvent;
        switch(event.type) {
            case 'DECISION_PREPAREE':
            case 'DECISION_DROITS_PREPAREE':
            case 'DECISION_RESSOURCES_PREPAREE':
                return { ...state, ...applyDecisionPrepartee(state, event as any) };
            case 'DECISION_VALIDEE':
                return { ...state, ...applyDecisionValidee(state, event) };
            case 'MUTATION_ANNULEE':
                return { ...state, ...applyMutationAnnulee(state, event) };
        }
    }
    return state;
}

// 4. Queries (Selectors)
export function queryDecisionsAPrendre(state: AppState): DecisionData[] {
    return state.decisions;
}
