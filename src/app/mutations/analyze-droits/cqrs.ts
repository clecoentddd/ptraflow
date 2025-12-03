
"use client";

import type { AppState, BaseEvent, TodoStatus } from '../mutation-lifecycle/cqrs';

// Command
export interface AnalyzeDroitsCommand {
  type: 'ANALYZE_DROITS';
  payload: {
    mutationId: string;
  };
}

// Event
export interface DroitsAnalysesEvent extends BaseEvent {
    type: 'DROITS_ANALYSES';
    payload: {
        userEmail: string;
    }
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

  return { ...state, eventStream: [event, ...state.eventStream] };
}
