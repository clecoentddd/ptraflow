
"use client";

import type { AppState } from '../mutation-lifecycle/domain';
import type { ValiderPlanPaiementCommand } from './command';
import type { PlanDeCalculValideEvent } from './event';
import type { DecisionValideeEvent } from '../valider-decision/event';
import { toast } from 'react-hot-toast';
import { eachMonthOfInterval, parse, format } from 'date-fns';

// Command Handler
export function validerPlanPaiementCommandHandler(state: AppState, command: ValiderPlanPaiementCommand): AppState {
  const { mutationId } = command.payload;

  const decisionEvent = state.eventStream
    .find(event => event.mutationId === mutationId && event.type === 'DECISION_VALIDEE') as DecisionValideeEvent | undefined;

  if (!decisionEvent) {
    toast.error("Impossible de trouver la décision validée pour cette mutation.");
    return state;
  }
  
  const { planDePaiementId, payload } = decisionEvent;
  const { mutationType, detailCalcul, periodeDroits, periodeModifications } = payload;

  let finalEvent: PlanDeCalculValideEvent;

  if (mutationType === 'DROITS') {
    // --- DROITS: The event contains the full payment plan to replace the old one ---
    finalEvent = {
        id: crypto.randomUUID(),
        type: 'PLAN_DE_CALCUL_VALIDE',
        mutationId,
        timestamp: new Date().toISOString(),
        payload: {
            planDePaiementId,
            paiements: detailCalcul, // The full list of payments
            dateDebut: periodeDroits?.dateDebut,
            dateFin: periodeDroits?.dateFin,
        }
    };

  } else { // RESSOURCES
    // --- RESSOURCES: The event contains only payments for the modified months ---
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
      type: 'PLAN_DE_CALCUL_VALIDE',
      mutationId,
      timestamp: new Date().toISOString(),
      payload: {
          planDePaiementId,
          paiements: paiementsAPatcher
      }
    };
  }

  return { ...state, eventStream: [finalEvent, ...state.eventStream] };
}
