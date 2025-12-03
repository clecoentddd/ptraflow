"use client";

import React, { createContext, useContext, useReducer, type Dispatch } from 'react';

// 1. TYPES
// ===========
export type MutationType = 'DROITS';
export type MutationStatus = 'OUVERTE' | 'EN_COURS' | 'COMPLETEE' | 'REJETEE';

// Events
interface BaseEvent {
  id: string;
  type: string;
  mutationId: string;
  timestamp: string;
}

export interface DroitsMutationCreatedEvent extends BaseEvent {
  type: 'DROITS_MUTATION_CREATED';
  payload: {
    mutationType: 'DROITS';
  };
}

export interface DroitsMutationStepAdvancedEvent extends BaseEvent {
  type: 'DROITS_MUTATION_STEP_ADVANCED';
  payload: {
    newStep: number;
  };
}

export interface DroitsMutationCompletedEvent extends BaseEvent {
  type: 'DROITS_MUTATION_COMPLETED';
}

export type AppEvent =
  | DroitsMutationCreatedEvent
  | DroitsMutationStepAdvancedEvent
  | DroitsMutationCompletedEvent;

// Commands
interface BaseCommand {
  type: string;
}

export interface CreateDroitsMutationCommand extends BaseCommand {
  type: 'CREATE_DROITS_MUTATION';
}

export interface AdvanceMutationStepCommand extends BaseCommand {
  type: 'ADVANCE_MUTATION_STEP';
  payload: {
    mutationId: string;
  };
}

export type AppCommand = CreateDroitsMutationCommand | AdvanceMutationStepCommand;

// Projections (Read Model)
export interface Mutation {
  id: string;
  type: MutationType;
  status: MutationStatus;
  history: AppEvent[];
  currentStep: number;
  totalSteps: number;
}

export interface AppState {
  mutations: Mutation[];
  eventStream: AppEvent[];
}

// 2. WORKFLOW DEFINITION
// ======================
export const DROITS_MUTATION_WORKFLOW = {
  steps: ['Création', 'Analyse de droits', 'Validation', 'Finalisation'],
  totalSteps: 4,
};

// 3. INITIAL STATE
// ==================
const initialState: AppState = {
  mutations: [],
  eventStream: [],
};

// 4. REDUCER (COMMAND HANDLER + PROJECTION)
// ===========================================
// In a real CQRS system, this would be split. For this UI prototype, we combine them.
function cqrsReducer(state: AppState, command: AppCommand): AppState {
  switch (command.type) {
    case 'CREATE_DROITS_MUTATION': {
      const mutationId = crypto.randomUUID();
      const event: DroitsMutationCreatedEvent = {
        id: crypto.randomUUID(),
        type: 'DROITS_MUTATION_CREATED',
        mutationId,
        timestamp: new Date().toISOString(),
        payload: { mutationType: 'DROITS' },
      };

      // Apply event to create new projection
      const newMutation: Mutation = {
        id: mutationId,
        type: 'DROITS',
        status: 'OUVERTE',
        history: [event],
        currentStep: 0,
        totalSteps: DROITS_MUTATION_WORKFLOW.totalSteps,
      };

      return {
        ...state,
        eventStream: [event, ...state.eventStream],
        mutations: [newMutation, ...state.mutations],
      };
    }

    case 'ADVANCE_MUTATION_STEP': {
      const { mutationId } = command.payload;
      const mutationIndex = state.mutations.findIndex((m) => m.id === mutationId);
      if (mutationIndex === -1) return state;

      const mutationToUpdate = state.mutations[mutationIndex];
      if (mutationToUpdate.status === 'COMPLETEE' || mutationToUpdate.status === 'REJETEE') {
        return state;
      }

      const newStep = mutationToUpdate.currentStep + 1;
      const isCompleted = newStep >= mutationToUpdate.totalSteps -1;

      const event: AppEvent = isCompleted
        ? {
            id: crypto.randomUUID(),
            type: 'DROITS_MUTATION_COMPLETED',
            mutationId,
            timestamp: new Date().toISOString(),
          }
        : {
            id: crypto.randomUUID(),
            type: 'DROITS_MUTATION_STEP_ADVANCED',
            mutationId,
            timestamp: new Date().toISOString(),
            payload: { newStep },
          };

      // Apply event to update projection
      const updatedMutation: Mutation = {
        ...mutationToUpdate,
        history: [event, ...mutationToUpdate.history],
        currentStep: isCompleted ? mutationToUpdate.totalSteps - 1 : newStep,
        status: isCompleted ? 'COMPLETEE' : 'EN_COURS',
      };
      
      const newMutations = [...state.mutations];
      newMutations[mutationIndex] = updatedMutation;

      return {
        ...state,
        eventStream: [event, ...state.eventStream],
        mutations: newMutations,
      };
    }

    default:
      return state;
  }
}

// 5. CONTEXT & PROVIDER
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

// 6. HOOK
// =========
export function useCqrs() {
  const context = useContext(CqrsContext);
  if (context === undefined) {
    throw new Error('useCqrs must be used within a CqrsProvider');
  }
  return context;
}
