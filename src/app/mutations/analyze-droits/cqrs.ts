
"use client";

import type { AppState, AppEvent, MutationStatus, TodoStatus } from '../mutation-lifecycle/cqrs';

// Command
export interface AnalyzeDroitsCommand {
  type: 'ANALYZE_DROITS';
  payload: {
    mutationId: string;
  };
}

// Event
export interface DroitsAnalysesEvent extends AppEvent {
    type: 'DROITS_ANALYSES';
    payload: {
        userEmail: string;
    }
}

// Projection
function applyDroitsAnalyses(state: AppState, event: DroitsAnalysesEvent): AppState {
    const newState = { ...state };
    
    newState.mutations = newState.mutations.map(m =>
        m.id === event.mutationId ? { ...m, history: [...m.history, event] } : m
    );

    newState.todos = newState.todos.map(t => {
        if (t.mutationId === event.mutationId) {
            if (t.description === "Analyser les droits") {
                 return { ...t, status: 'fait' as TodoStatus };
            }
             if (t.description === "Valider la mutation") {
                return { ...t, status: 'à faire' as TodoStatus };
            }
        }
        return t;
    });

    newState.eventStream = [event, ...newState.eventStream];
    return newState;
}

// Command Handler
export function analyzeDroitsReducer(state: AppState, command: AnalyzeDroitsCommand): AppState {
  const { mutationId } = command.payload;
  
  const todo = state.todos.find(t => t.mutationId === mutationId && t.description === 'Analyser les droits');
  if (!todo || todo.status !== 'à faire') return state;

  const event: DroitsAnalysesEvent = {
    id: crypto.randomUUID(),
    type: 'DROITS_ANALYSES',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        userEmail: 'anonymous'
    }
  };

  return applyDroitsAnalyses(state, event);
}
