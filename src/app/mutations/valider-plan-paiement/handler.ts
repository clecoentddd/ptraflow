
"use client";

import type { AppState } from '../mutation-lifecycle/domain';
import type { ValiderPlanPaiementCommand } from './command';
import type { PlanPaiementValideEvent } from './event';
import type { DroitsAnalysesEvent } from '../analyze-droits/event';

// Command Handler
export function validerPlanPaiementCommandHandler(state: AppState, command: ValiderPlanPaiementCommand): AppState {
  const { mutationId } = command.payload;

  const droitsAnalysesEvent = state.eventStream
    .find(event => event.mutationId === mutationId && event.type === 'DROITS_ANALYSES') as DroitsAnalysesEvent | undefined;

  const payload: PlanPaiementValideEvent['payload'] = {
    userEmail: 'anonymous' // In a real app, this would come from auth
  };

  if (droitsAnalysesEvent) {
    payload.dateDebut = droitsAnalysesEvent.payload.dateDebut;
    payload.dateFin = droitsAnalysesEvent.payload.dateFin;
  }

  const event: PlanPaiementValideEvent = {
    id: crypto.randomUUID(),
    type: 'PLAN_PAIEMENT_VALIDE',
    mutationId,
    timestamp: new Date().toISOString(),
    payload,
  };

  return { ...state, eventStream: [event, ...state.eventStream] };
}
