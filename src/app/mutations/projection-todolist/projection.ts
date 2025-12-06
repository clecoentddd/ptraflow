

"use client";

import type { AppEvent, AppCommand, AppState, Todo, MutationType } from '../mutation-lifecycle/domain';
import type { DroitsMutationCreatedEvent } from '../create-mutation/event';
import type { RessourcesMutationCreatedEvent } from '../create-ressources-mutation/event';
import type { PaiementsSuspendusEvent } from '../suspend-paiements/event';
import type { ModificationDroitsAutoriseeEvent } from '../autoriser-modification-des-droits/event';
import type { DroitsAnalysesEvent } from '../analyze-droits/event';
import type { PlanDeCalculValideEvent } from '../valider-plan-paiement/event';
import type { ModificationRessourcesAutoriseeEvent } from '../autoriser-modification-des-ressources/event';
import type { ModificationRessourcesValideeEvent } from '../valider-modification-ressources/event';
import type { PlanCalculeEvent } from '../calculer-plan/event';
import type { DecisionValideeEvent } from '../valider-decision/event';


// 1. State Slice and Initial State
export interface TodolistState {
  todos: Todo[];
}

export const initialTodolistState: TodolistState = {
  todos: [],
};


// 2. Projection Logic for this Slice

function applyDroitsMutationCreated(state: TodolistState, event: DroitsMutationCreatedEvent): TodolistState {
    const newTodos: Todo[] = [
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Suspendre les paiements", status: 'à faire' },
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Autoriser la modification de droits", status: 'en attente' },
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Analyser les droits", status: 'en attente' },
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Autoriser la modification de ressources", status: 'en attente' },
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Valider la modification des ressources", status: 'en attente' },
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Calculer le plan", status: 'en attente' },
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Valider la décision", status: 'en attente' },
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Valider le plan de paiement", status: 'en attente' },
    ];
    return { ...state, todos: [...state.todos.filter(t => t.mutationId !== event.mutationId), ...newTodos] };
}

function applyRessourcesMutationCreated(state: TodolistState, event: RessourcesMutationCreatedEvent): TodolistState {
    const newTodos: Todo[] = [
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Suspendre les paiements", status: 'à faire' },
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Autoriser la modification de ressources", status: 'en attente' },
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Valider la modification des ressources", status: 'en attente' },
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Calculer le plan", status: 'en attente' },
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Valider la décision", status: 'en attente' },
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Valider le plan de paiement", status: 'en attente' },
    ];
    return { ...state, todos: [...state.todos.filter(t => t.mutationId !== event.mutationId), ...newTodos] };
}

function applyPaiementsSuspendus(state: TodolistState, event: PaiementsSuspendusEvent, mutations: AppState['mutations']): TodolistState {
    return {
        ...state,
        todos: state.todos.map(t => {
            if (t.mutationId !== event.mutationId) return t;

            // Mark "Suspendre les paiements" as done
            if (t.description === "Suspendre les paiements") return { ...t, status: 'fait' };
            
            const mutation = mutations.find(m => m.id === event.mutationId);
            if (!mutation) return t;

            // Unlock next step based on mutation type
            if (mutation.type === 'DROITS' && t.description === "Autoriser la modification de droits") {
                return { ...t, status: 'à faire' };
            }
            if (mutation.type === 'RESSOURCES' && t.description === "Autoriser la modification de ressources") {
                 return { ...t, status: 'à faire' };
            }
            
            return t;
        })
    };
}

function applyModificationDroitsAutorisee(state: TodolistState, event: ModificationDroitsAutoriseeEvent): TodolistState {
    return {
        ...state,
        todos: state.todos.map(t => {
            if (t.mutationId !== event.mutationId) return t;
            if (t.description === "Autoriser la modification de droits") return { ...t, status: 'fait' };
            if (t.description === "Analyser les droits") return { ...t, status: 'à faire' };
            return t;
        })
    };
}

function applyDroitsAnalyses(state: TodolistState, event: DroitsAnalysesEvent): TodolistState {
    return {
        ...state,
        todos: state.todos.map(t => {
            if (t.mutationId !== event.mutationId) return t;
            if (t.description === "Analyser les droits") return { ...t, status: 'fait' };
            // Unlock "Autoriser la modification de ressources" for DROITS mutation
            if (t.description === "Autoriser la modification de ressources") return { ...t, status: 'à faire' };
            return t;
        })
    };
}

function applyModificationRessourcesAutorisee(state: TodolistState, event: ModificationRessourcesAutoriseeEvent): TodolistState {
    return {
        ...state,
        todos: state.todos.map(t => {
            if (t.mutationId !== event.mutationId) return t;
            // Mark the current step as 'fait'
            if (t.description === "Autoriser la modification de ressources") return { ...t, status: 'fait' };
            // Unlock the next step
            if (t.description === "Valider la modification des ressources") return { ...t, status: 'à faire' };
            return t;
        })
    };
}

function applyModificationRessourcesValidee(state: TodolistState, event: ModificationRessourcesValideeEvent): TodolistState {
    return {
        ...state,
        todos: state.todos.map(t => {
            if (t.mutationId !== event.mutationId) return t;
            if (t.description === "Valider la modification des ressources") return { ...t, status: 'fait' };
            if (t.description === "Calculer le plan") return { ...t, status: 'à faire' };
            return t;
        })
    };
}

function applyPlanCalcule(state: TodolistState, event: PlanCalculeEvent): TodolistState {
    return {
        ...state,
        todos: state.todos.map(t => {
            if (t.mutationId !== event.mutationId) return t;
            if (t.description === "Calculer le plan") return { ...t, status: 'fait' };
            if (t.description === "Valider la décision") return { ...t, status: 'à faire' };
            return t;
        })
    };
}

function applyDecisionValidee(state: TodolistState, event: DecisionValideeEvent): TodolistState {
    return {
        ...state,
        todos: state.todos.map(t => {
            if (t.mutationId !== event.mutationId) return t;
            if (t.description === "Valider la décision") return { ...t, status: 'fait' };
            if (t.description === "Valider le plan de paiement") return { ...t, status: 'à faire' };
            return t;
        })
    };
}


function applyPlanDeCalculValide(state: TodolistState, event: PlanDeCalculValideEvent): TodolistState {
    return {
        ...state,
        todos: state.todos.map(t => {
            if (t.mutationId === event.mutationId && t.description === "Valider le plan de paiement") {
                return { ...t, status: 'fait' };
            }
            return t;
        })
    };
}


// 3. Slice Reducer
export function todolistProjectionReducer<T extends TodolistState & { mutations: AppState['mutations'] }>(
    state: T, 
    eventOrCommand: AppEvent | AppCommand
): T {
    if ('type' in eventOrCommand && 'payload' in eventOrCommand) { // It's an event
        const event = eventOrCommand as AppEvent;
        switch (event.type) {
            case 'DROITS_MUTATION_CREATED':
                return applyDroitsMutationCreated(state, event) as T;
            case 'RESSOURCES_MUTATION_CREATED':
                return applyRessourcesMutationCreated(state, event) as T;
            case 'PAIEMENTS_SUSPENDUS':
                return applyPaiementsSuspendus(state, event, state.mutations) as T;
             case 'MODIFICATION_DROITS_AUTORISEE':
                return applyModificationDroitsAutorisee(state, event) as T;
            case 'DROITS_ANALYSES':
                return applyDroitsAnalyses(state, event) as T;
            case 'MODIFICATION_RESSOURCES_AUTORISEE':
                return applyModificationRessourcesAutorisee(state, event) as T;
            case 'MODIFICATION_RESSOURCES_VALIDEE':
                return applyModificationRessourcesValidee(state, event) as T;
            case 'PLAN_CALCUL_EFFECTUE':
                return applyPlanCalcule(state, event) as T;
            case 'DECISION_VALIDEE':
                return applyDecisionValidee(state, event) as T;
            case 'PLAN_DE_CALCUL_VALIDE':
                return applyPlanDeCalculValide(state, event) as T;
        }
    }
    return state;
}

// 4. Query (Selector)
export function queryTodos(state: AppState): Todo[] {
    return state.todos;
}
