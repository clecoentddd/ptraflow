

"use client";

import type { AppEvent, AppCommand, AppState, Mutation } from '../mutation-lifecycle/domain';
import type { DroitsMutationCreatedEvent } from '../create-mutation/event';
import type { PaiementsSuspendusEvent } from '../suspend-paiements/event';
import type { PlanDeCalculValideEvent } from '../valider-plan-paiement/event';
import type { RessourcesMutationCreatedEvent } from '../create-ressources-mutation/event';

// 1. State Slice and Initial State
export interface MutationsState {
  mutations: Mutation[];
}

export const initialMutationsState: MutationsState = {
  mutations: [],
};


// 2. Projection Logic for this Slice

function applyDroitsMutationCreated(state: MutationsState, event: DroitsMutationCreatedEvent): MutationsState {
    const newMutation: Mutation = {
        id: event.mutationId,
        type: 'DROITS',
        status: 'OUVERTE',
        history: [event],
    };
    return { ...state, mutations: [newMutation, ...state.mutations.filter(m => m.id !== newMutation.id)] };
}

function applyRessourcesMutationCreated(state: MutationsState, event: RessourcesMutationCreatedEvent): MutationsState {
    const newMutation: Mutation = {
        id: event.mutationId,
        type: 'RESSOURCES',
        status: 'OUVERTE',
        history: [event],
    };
    return { ...state, mutations: [newMutation, ...state.mutations.filter(m => m.id !== newMutation.id)] };
}

function applyPaiementsSuspendus(state: MutationsState, event: PaiementsSuspendusEvent): MutationsState {
    return {
        ...state,
        mutations: state.mutations.map(m =>
            m.id === event.mutationId ? { ...m, history: [...m.history, event], status: 'EN_COURS' as const } : m
        ),
    };
}

function applyPlanDeCalculValide(state: MutationsState, event: PlanDeCalculValideEvent): MutationsState {
    return {
        ...state,
        mutations: state.mutations.map(m =>
            m.id === event.mutationId ? { ...m, history: [...m.history, event], status: 'COMPLETEE' as const } : m
        ),
    };
}

function addEventToHistory<T extends { id: string, history: AppEvent[] }>(items: T[], event: AppEvent): T[] {
    return items.map(item => 
        item.id === event.mutationId 
            ? { ...item, history: [...item.history, event] } 
            : item
    );
}


// 3. Slice Reducer
export function mutationsProjectionReducer<T extends MutationsState>(
    state: T, 
    eventOrCommand: AppEvent | AppCommand
): T {
    if ('type' in eventOrCommand) {
        if ('payload' in eventOrCommand) { // It's an event
            const event = eventOrCommand;
             // First, just add the event to the history of the relevant mutation
            let nextState = { ...state, mutations: addEventToHistory(state.mutations, event) };

            switch (event.type) {
                case 'DROITS_MUTATION_CREATED':
                    return applyDroitsMutationCreated(nextState, event) as T;
                case 'RESSOURCES_MUTATION_CREATED':
                    return applyRessourcesMutationCreated(nextState, event) as T;
                case 'PAIEMENTS_SUSPENDUS':
                    return applyPaiementsSuspendus(nextState, event) as T;
                case 'PLAN_DE_CALCUL_VALIDE':
                    return applyPlanDeCalculValide(nextState, event) as T;
                default:
                    return nextState as T;
            }
        }
    }
    return state;
}


// 4. Query (Selector)
export function queryMutations(state: AppState): Mutation[] {
    // We return mutations sorted by the most recent event timestamp
    return [...state.mutations].sort((a, b) => {
        const lastEventA = a.history[a.history.length - 1];
        const lastEventB = b.history[b.history.length - 1];
        if (!lastEventA || !lastEventB) return 0;
        return new Date(lastEventB.timestamp).getTime() - new Date(lastEventA.timestamp).getTime();
    });
}
