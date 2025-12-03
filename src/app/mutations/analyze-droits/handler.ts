
"use client";

import type { AppState } from '../mutation-lifecycle/cqrs';
import type { AnalyzeDroitsCommand } from './command';
import type { DroitsAnalysesEvent } from './event';
import { toast as realToast } from 'react-hot-toast';

type HandlerDependencies = {
  toast: { error: (message: string) => void };
}

// Command Handler
export function analyzeDroitsCommandHandler(
    state: AppState, 
    command: AnalyzeDroitsCommand,
    dependencies: HandlerDependencies = { toast: realToast }
): AppState {
  const { mutationId, dateDebut, dateFin } = command.payload;
  
  if (new Date(dateDebut) > new Date(dateFin)) {
    dependencies.toast.error('La date de début doit être antérieure ou égale à la date de fin.');
    return state;
  }

  const event: DroitsAnalysesEvent = {
    id: crypto.randomUUID(),
    type: 'DROITS_ANALYSES',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        userEmail: 'anonymous',
        dateDebut,
        dateFin,
    }
  };

  return { ...state, eventStream: [event, ...state.eventStream] };
}
