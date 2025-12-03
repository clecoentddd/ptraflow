
"use client";

import type { AppState, AppEvent, Mutation, Todo } from '../mutation-lifecycle/cqrs';

// Command
export interface CreateDroitsMutationCommand {
  type: 'CREATE_DROITS_MUTATION';
}

// Event
export interface DroitsMutationCreatedEvent extends AppEvent {
  type: 'DROITS_MUTATION_CREATED';
  payload: {
    mutationType: 'DROITS';
  };
}

// Projection
function applyDroitsMutationCreated(state: AppState, event: DroitsMutationCreatedEvent): AppState {
    const newState = { ...state };

    const newMutation: Mutation = {
        id: event.mutationId,
        type: 'DROITS',
        status: 'OUVERTE',
        history: [event],
    };

    const newTodos: Todo[] = [
        {
            id: crypto.randomUUID(),
            mutationId: event.mutationId,
            description: "Suspendre les paiements",
            status: 'à faire',
        },
        {
            id: crypto.randomUUID(),
            mutationId: event.mutationId,
            description: "Analyser les droits",
            status: 'en attente',
        },
         {
            id: crypto.randomUUID(),
            mutationId: event.mutationId,
            description: "Valider la mutation",
            status: 'en attente',
        },
    ];

    newState.mutations = [newMutation, ...newState.mutations];
    newState.todos = [...newState.todos, ...newTodos];
    newState.eventStream = [event, ...newState.eventStream];

    return newState;
}

// Command Handler
export function createDroitsMutationReducer(state: AppState, command: CreateDroitsMutationCommand): AppState {
  const mutationId = crypto.randomUUID();
  const event: DroitsMutationCreatedEvent = {
    id: crypto.randomUUID(),
    type: 'DROITS_MUTATION_CREATED',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: { mutationType: 'DROITS' },
  };

  return applyDroitsMutationCreated(state, event);
}
