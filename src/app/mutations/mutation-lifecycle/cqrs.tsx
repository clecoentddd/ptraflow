
"use client";

import React, { createContext, useContext, useReducer, type Dispatch } from 'react';
import { createDroitsMutationReducer, applyDroitsMutationCreated } from '../create-mutation/handler';
import { type CreateDroitsMutationCommand } from '../create-mutation/command';
import type { DroitsMutationCreatedEvent } from '../create-mutation/event';
import { suspendPaiementsReducer, type SuspendPaiementsCommand } from '../suspend-paiements/cqrs';
import { analyzeDroitsReducer, type AnalyzeDroitsCommand } from '../analyze-droits/cqrs';

// 1. TYPES
// ===========

// Event Union
export type AppEvent = DroitsMutationCreatedEvent | import('../suspend-paiements/cqrs').PaiementsSuspendusEvent | import('../analyze-droits/cqrs').DroitsAnalysesEvent;

// Command Union
export type AppCommand = CreateDroitsMutationCommand | SuspendPaiementsCommand | AnalyzeDroitsCommand;

// Projections (Read Model)
export type MutationType = 'DROITS';
export type MutationStatus = 'OUVERTE' | 'EN_COURS' | 'COMPLETEE' | 'REJETEE';

export interface Mutation {
  id: string;
  type: MutationType;
  status: MutationStatus;
  history: AppEvent[];
}

export type TodoStatus = 'à faire' | 'fait' | 'en attente';

export interface Todo {
    id: string;
    mutationId: string;
    description: string;
    status: TodoStatus;
}

export interface AppState {
  mutations: Mutation[];
  todos: Todo[];
  eventStream: AppEvent[];
}


// 2. INITIAL STATE
// ==================
const initialState: AppState = {
  mutations: [],
  todos: [],
  eventStream: [],
};

// 3. AGGREGATE REDUCER (COMMAND HANDLER)
// ======================================

// This reducer now delegates command handling to the specific slice reducers.
function cqrsReducer(state: AppState, command: AppCommand): AppState {
  switch (command.type) {
    case 'CREATE_DROITS_MUTATION':
        return createDroitsMutationReducer(state, command);
    case 'SUSPEND_PAIEMENTS':
        return suspendPaiementsReducer(state, command);
    case 'ANALYZE_DROITS':
        return analyzeDroitsReducer(state, command);
    default:
      return state;
  }
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
