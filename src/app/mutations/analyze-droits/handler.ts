"use client";

import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { AnalyzeDroitsCommand } from './command';
import type { DroitsAnalysesEvent } from './event';
import { toast as realToast } from 'react-hot-toast';
import { format } from 'date-fns';
import { publishEvent } from '../mutation-lifecycle/event-bus';

type HandlerDependencies = {
  toast: { error: (message: string) => void };
}

// Command Handler
export function analyzeDroitsCommandHandler(
    state: AppState, 
    command: AnalyzeDroitsCommand,
    dependencies: HandlerDependencies = { toast: realToast }
): void {
  const { mutationId, dateDebut, dateFin } = command.payload;
  
  // This is the business rule validation
  if (new Date(dateDebut) > new Date(dateFin)) {
    dependencies.toast.error('La date de début doit être antérieure ou égale à la date de fin.');
    return; // Return current state without creating an event
  }

  const event: DroitsAnalysesEvent = {
    id: crypto.randomUUID(),
    type: 'DROITS_ANALYSES',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        userEmail: 'anonymous',
        dateDebut: format(new Date(dateDebut), 'MM-yyyy'),
        dateFin: format(new Date(dateFin), 'MM-yyyy'),
    }
  };

  publishEvent(event);
}
