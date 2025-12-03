"use client";

import type { AppState } from '../mutation-lifecycle/cqrs';
import type { AnalyzeDroitsCommand } from './command';
import type { DroitsAnalysesEvent } from './event';

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
