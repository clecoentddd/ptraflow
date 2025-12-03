
"use client";

import React, { createContext, useContext, useReducer, type Dispatch } from 'react';

// Importation des types de commandes, événements et état depuis le domaine
import type { AppCommand, AppEvent, AppState, Mutation } from './domain';

// Importation des command handlers
import { createDroitsMutationCommandHandler } from '../create-mutation/handler';
import { suspendPaiementsCommandHandler } from '../suspend-paiements/handler';
import { analyzeDroitsCommandHandler } from '../analyze-droits/handler';
import { validateMutationCommandHandler } from '../validate-mutation/handler';
import { createRessourcesMutationCommandHandler } from '../create-ressources-mutation/handler';
import { autoriserModificationDroitsCommandHandler } from '../autoriser-modification-des-droits/handler';
import { autoriserModificationRessourcesCommandHandler } from '../autoriser-modification-des-ressources/handler';

// Importation des types d'événements pour la projection
import type { DroitsMutationCreatedEvent } from '../create-mutation/event';
import type { PaiementsSuspendusEvent } from '../suspend-paiements/event';
import type { DroitsAnalysesEvent } from '../analyze-droits/event';
import type { MutationValidatedEvent } from '../validate-mutation/event';
import type { RessourcesMutationCreatedEvent } from '../create-ressources-mutation/event';
import type { ModificationDroitsAutoriseeEvent } from '../autoriser-modification-des-droits/event';
import type { ModificationRessourcesAutoriseeEvent } from '../autoriser-modification-des-ressources/event';

// Importation des logiques de projection
import { validatedPeriodsProjectionReducer, initialValidatedPeriodsState } from '../projection-periodes-de-droits/projection';
import { Todo } from './domain';


// 1. INITIAL STATE
// ==================
export const initialState: AppState = {
  mutations: [],
  todos: [],
  eventStream: [],
  ...initialValidatedPeriodsState,
};

// 2. PROJECTION LOGIC
// ======================

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
            description: 'Autoriser la modification',
            status: 'en attente'
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

    newState.mutations = [newMutation, ...newState.mutations.filter(m => m.id !== newMutation.id)];
    newState.todos = [...newState.todos.filter(t => t.mutationId !== newMutation.id), ...newTodos];

    return newState;
}

function applyRessourcesMutationCreated(state: AppState, event: RessourcesMutationCreatedEvent): AppState {
    const newState = { ...state };

    const newMutation: Mutation = {
        id: event.mutationId,
        type: 'RESSOURCES',
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
            description: "Valider la mutation",
            status: 'en attente',
        },
    ];

    newState.mutations = [newMutation, ...newState.mutations.filter(m => m.id !== newMutation.id)];
    newState.todos = [...newState.todos.filter(t => t.mutationId !== newMutation.id), ...newTodos];

    return newState;
}


function applyPaiementsSuspendus(state: AppState, event: PaiementsSuspendusEvent): AppState {
    const newState = { ...state };
    
    newState.mutations = newState.mutations.map(m =>
        m.id === event.mutationId ? { ...m, history: [...m.history, event], status: 'EN_COURS' as const } : m
    );

    newState.todos = newState.todos.map(t => {
        if (t.mutationId === event.mutationId) {
            if (t.description === "Suspendre les paiements") {
                 return { ...t, status: 'fait' as const };
            }
            
            const mutation = newState.mutations.find(m => m.id === event.mutationId);
            if (mutation?.type === 'DROITS' && t.description === "Autoriser la modification") {
                return { ...t, status: 'à faire' as const };
            }
            
            if (mutation?.type === 'RESSOURCES' && t.description === "Valider la mutation") {
                return { ...t, status: 'à faire' as const };
            }
        }
        return t;
    });

    return newState;
}

function applyModificationDroitsAutorisee(state: AppState, event: ModificationDroitsAutoriseeEvent): AppState {
    const newState = { ...state };

    newState.mutations = newState.mutations.map(m =>
        m.id === event.mutationId ? { ...m, history: [...m.history, event] } : m
    );

    newState.todos = newState.todos.map(t => {
        if (t.mutationId === event.mutationId) {
            if (t.description === "Autoriser la modification") {
                 return { ...t, status: 'fait' as const };
            }
             if (t.description === "Analyser les droits") {
                return { ...t, status: 'à faire' as const };
            }
        }
        return t;
    });

    return newState;
}


function applyDroitsAnalyses(state: AppState, event: DroitsAnalysesEvent): AppState {
    const newState = { ...state };
    
    newState.mutations = newState.mutations.map(m =>
        m.id === event.mutationId ? { ...m, history: [...m.history, event] } : m
    );

    newState.todos = newState.todos.map(t => {
        if (t.mutationId === event.mutationId) {
            if (t.description === "Analyser les droits") {
                 return { ...t, status: 'fait' as const };
            }
             if (t.description === "Valider la mutation") {
                return { ...t, status: 'à faire'as const };
            }
        }
        return t;
    });

    return newState;
}

function applyMutationValidated(state: AppState, event: MutationValidatedEvent): AppState {
    let newState = { ...state };
    
    newState.mutations = newState.mutations.map(m =>
        m.id === event.mutationId ? { ...m, history: [...m.history, event], status: 'COMPLETEE' as const } : m
    );

    newState.todos = newState.todos.map(t => {
        if (t.mutationId === event.mutationId && t.description === "Valider la mutation") {
            return { ...t, status: 'fait' as const };
        }
        return t;
    });

    return newState;
}


function applyModificationRessourcesAutorisee(state: AppState, event: ModificationRessourcesAutoriseeEvent): AppState {
    const newState = { ...state };

    newState.mutations = newState.mutations.map(m =>
        m.id === event.mutationId ? { ...m, history: [...m.history, event] } : m
    );

    newState.todos = newState.todos.map(t => {
        if (t.mutationId === event.mutationId) {
            if (t.description === "Autoriser la modification") {
                 return { ...t, status: 'fait' as const };
            }
             if (t.description === "Valider la mutation") {
                return { ...t, status: 'à faire' as const };
            }
        }
        return t;
    });

    return newState;
}



// This function will rebuild the state from the event stream for the main application.
function rebuildStateFromEvents(events: AppState['eventStream']): AppState {
    let state: AppState = { ...initialState, eventStream: events };
    const sortedEvents = [...events].reverse();

    for (const event of sortedEvents) {
        state = applyEvent(state, event);
    }
    return state;
}

function applyEvent(state: AppState, event: AppEvent): AppState {
    let nextState = state;
    switch (event.type) {
        case 'DROITS_MUTATION_CREATED':
            nextState = applyDroitsMutationCreated(nextState, event);
            break;
        case 'RESSOURCES_MUTATION_CREATED':
            nextState = applyRessourcesMutationCreated(nextState, event);
            break;
        case 'PAIEMENTS_SUSPENDUS':
            nextState = applyPaiementsSuspendus(nextState, event);
            break;
        case 'MODIFICATION_DROITS_AUTORISEE':
            nextState = applyModificationDroitsAutorisee(nextState, event);
            break;
        case 'MODIFICATION_RESSOURCES_AUTORISEE':
            nextState = applyModificationRessourcesAutorisee(nextState, event);
            break;
        case 'DROITS_ANALYSES':
            nextState = applyDroitsAnalyses(nextState, event);
            break;
        case 'MUTATION_VALIDATED':
            nextState = applyMutationValidated(nextState, event);
            break;
    }
    // After applying the main logic, we pass the state and event to the projection slice reducers
    nextState = validatedPeriodsProjectionReducer(nextState, event);
    
    return nextState;
}


// 3. AGGREGATE REDUCER (COMMAND DISPATCHER)
// ======================================

export function cqrsReducer(state: AppState, command: AppCommand): AppState {

    // For BDD tests: projection is handled separately.
    if (command.type === 'REPLAY') {
       return applyEvent(state, command.event);
    }
    if (command.type === 'REPLAY_COMPLETE') {
       // Filter out completed/rejected mutations from view
       let finalState = { ...state, mutations: state.mutations.filter(m => m.status === 'OUVERTE' || m.status === 'EN_COURS') };
       // Call projection reducers one last time after replay to finalize their state if needed
       finalState = validatedPeriodsProjectionReducer(finalState, command);
       return finalState;
    }


    let newState = state;

    // The command handlers only produce events and add them to the stream.
    // They don't contain projection logic.
    switch (command.type) {
        case 'CREATE_DROITS_MUTATION':
            newState = createDroitsMutationCommandHandler(state, command);
            break;
        case 'CREATE_RESSOURCES_MUTATION':
            newState = createRessourcesMutationCommandHandler(state, command);
            break;
        case 'SUSPEND_PAIEMENTS':
            newState = suspendPaiementsCommandHandler(state, command);
            break;
        case 'AUTORISER_MODIFICATION_DROITS':
            newState = autoriserModificationDroitsCommandHandler(state, command);
            break;
        case 'AUTORISER_MODIFICATION_RESSOURCES':
            newState = autoriserModificationRessourcesCommandHandler(state, command);
            break;
        case 'ANALYZE_DROITS':
            newState = analyzeDroitsCommandHandler(state, command);
            break;
        case 'VALIDATE_MUTATION':
            newState = validateMutationCommandHandler(state, command);
            break;
        default:
            return state;
    }

    // After a command has potentially added a new event,
    // we rebuild the entire state from the full event stream.
    // This is the "event sourcing" part of the pattern.
    const replayedState = rebuildStateFromEvents(newState.eventStream);
    return { ...replayedState, mutations: replayedState.mutations.filter(m => m.status === 'OUVERTE' || m.status === 'EN_COURS') };
}


// 4. CONTEXT & PROVIDER
// =======================
const CqrsContext = createContext<{ state: AppState; dispatch: Dispatch<AppCommand> } | undefined>(undefined);

export function CqrsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cqrsReducer, initialState);

  return (
    <CqrsContext.Provider value={{ state, dispatch }}>
      {children}
    </CqrsContext.Provider>
  );
}

// 5. HOOK
// =========
export function useCqrs() {
  const context = useContext(CqrsContext);
  if (context === undefined) {
    throw new Error('useCqrs must be used within a CqrsProvider');
  }
  return context;
}
