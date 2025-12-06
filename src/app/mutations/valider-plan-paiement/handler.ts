
"use client";

import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { ValiderPlanPaiementCommand } from './command';
import type { PlanPaiementRemplaceEvent, PlanPaiementPatchedEvent, PlanPaiementValideEvent } from './event';
import type { DecisionValideeEvent } from '../valider-decision/event';
import { toast } from 'react-hot-toast';
import { eachMonthOfInterval, parse } from 'date-fns';
import { format } from 'date-fns';

// Command Handler
export function validerPlanPaiementCommandHandler(state: AppState, command: ValiderPlanPaiementCommand): AppState {
  const { mutationId } = command.payload;

  const decisionEvent = state.eventStream
    .find(event => event.mutationId === mutationId && event.type === 'DECISION_VALIDEE') as DecisionValideeEvent | undefined;

  if (!decisionEvent) {
    toast.error("Impossible de trouver la décision validée pour cette mutation.");
    return state;
  }
  
  const { planDePaiementId, mutationType, detailCalcul, periodeDroits, periodeModifications } = decisionEvent.payload;

  let finalEvent: PlanPaiementRemplaceEvent | PlanPaiementPatchedEvent | PlanPaiementValideEvent;

  if (mutationType === 'DROITS') {
    // --- DROITS: Replace the entire payment plan ---
    finalEvent = {
        id: crypto.randomUUID(),
        type: 'PLAN_PAIEMENT_REMPLACE',
        mutationId,
        timestamp: new Date().toISOString(),
        payload: {
            planDePaiementId,
            paiements: detailCalcul, // The full list of payments
        }
    } satisfies PlanPaiementRemplaceEvent;

  } else { // RESSOURCES
    // --- RESSOURCES: Patch only the modified months ---
    if (!periodeModifications) {
      toast.error("Période de modification non trouvée pour la mutation de ressources.");
      return state;
    }
    
    const start = parse(periodeModifications.dateDebut, 'MM-yyyy', new Date());
    const end = parse(periodeModifications.dateFin, 'MM-yyyy', new Date());
    const modifiedMonths = new Set(eachMonthOfInterval({ start, end }).map(d => format(d, 'MM-yyyy')));

    const paiementsAPatcher = detailCalcul.filter(p => modifiedMonths.has(p.month));

    finalEvent = {
      id: crypto.randomUUID(),
      type: 'PLAN_PAIEMENT_PATCHE',
      mutationId,
      timestamp: new Date().toISOString(),
      payload: {
          planDePaiementId,
          paiements: paiementsAPatcher
      }
    } satisfies PlanPaiementPatchedEvent;
  }

  // Also dispatch the legacy event to mark the mutation as COMPLETEE
  const legacyEvent: PlanPaiementValideEvent = {
    id: crypto.randomUUID(),
    type: 'PLAN_PAIEMENT_VALIDEE',
    mutationId,
    timestamp: new Date(new Date(finalEvent.timestamp).getTime() + 1).toISOString(), // ensure it's after
    payload: {
        userEmail: 'anonymous',
        dateDebut: periodeDroits?.dateDebut,
        dateFin: periodeDroits?.dateFin
    }
  }

  return { ...state, eventStream: [legacyEvent, finalEvent, ...state.eventStream] };
}
