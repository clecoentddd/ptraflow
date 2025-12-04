
"use client";

import type { AppEvent, AppCommand, AppState, Todo, MutationType } from '../mutation-lifecycle/domain';
import type { DroitsMutationCreatedEvent } from '../create-mutation/event';
import type { RessourcesMutationCreatedEvent } from '../create-ressources-mutation/event';
import type { PaiementsSuspendusEvent } from '../suspend-paiements/event';
import type { ModificationDroitsAutoriseeEvent } from '../autoriser-modification-des-droits/event';
import type { DroitsAnalysesEvent } from '../analyze-droits/event';
import type { MutationValidatedEvent } from '../validate-mutation/event';
import type { ModificationRessourcesAutoriseeEvent } from '../autoriser-modification-des-ressources/event';


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
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: 'Autoriser la modification', status: 'en attente' },
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Analyser les droits", status: 'en attente' },
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Valider la mutation", status: 'en attente' },
    ];
    return { ...state, todos: [...state.todos.filter(t => t.mutationId !== event.mutationId), ...newTodos] };
}

function applyRessourcesMutationCreated(state: TodolistState, event: RessourcesMutationCreatedEvent): TodolistState {
    const newTodos: Todo[] = [
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Suspendre les paiements", status: 'à faire' },
        { id: crypto.randomUUID(), mutationId: event.mutationId, description: "Valider la mutation", status: 'en attente' },
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
            if (mutation.type === 'DROITS' && t.description === "Autoriser la modification") {
                return { ...t, status: 'à faire' };
            }
            if (mutation.type === 'RESSOURCES' && t.description === "Valider la mutation") {
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
            if (t.description === "Autoriser la modification") return { ...t, status: 'fait' };
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
            if (t.description === "Valider la mutation") return { ...t, status: 'à faire' };
            return t;
        })
    };
}

function applyModificationRessourcesAutorisee(state: TodolistState, event: ModificationRessourcesAutoriseeEvent): TodolistState {
    return {
        ...state,
        todos: state.todos.map(t => {
            if (t.mutationId !== event.mutationId) return t;
            if (t.description === "Autoriser la modification") return { ...t, status: 'fait' };
            if (t.description === "Valider la mutation") return { ...t, status: 'à faire' };
            return t;
        })
    };
}


function applyMutationValidated(state: TodolistState, event: MutationValidatedEvent): TodolistState {
    return {
        ...state,
        todos: state.todos.map(t => {
            if (t.mutationId === event.mutationId && t.description === "Valider la mutation") {
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
    if ('type' in eventOrCommand) {
        if ('payload' in eventOrCommand) { // It's an event
            const event = eventOrCommand;
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
                case 'MUTATION_VALIDATED':
                    return applyMutationValidated(state, event) as T;
            }
        }
    }
    return state;
}

// 4. Query (Selector)
export function queryTodos(state: AppState): Todo[] {
    return state.todos;
}
