
"use client";

import type { AppState } from '../mutation-lifecycle/domain';
import type { ValiderPlanPaiementCommand } from './command';
import type { PlanDeCalculValideEvent } from './event';
import type { DecisionValideeEvent } from '../valider-decision/event';
import { toast } from 'react-hot-toast';
import { eachMonthOfInterval, parse, format } from 'date-fns';
import { queryPlanDePaiement } from '../projection-plan-de-paiement/projection';

// Command Handler
export function validerPlanPaiementCommandHandler(state: AppState, command: ValiderPlanPaiementCommand): AppState {
  const { mutationId } = command.payload;

  // 1. Find the validated decision for this mutation
  const decisionEvent = state.eventStream
    .find(event => event.mutationId === mutationId && event.type === 'DECISION_VALIDEE') as DecisionValideeEvent | undefined;

  if (!decisionEvent) {
    toast.error("Impossible de trouver la décision validée pour cette mutation.");
    return state;
  }
  
  // 2. Concurrency Check
  // Get the payment plan ID known at the time of decision
  const idFromDecision = decisionEvent.planDePaiementId;
  
  // Get the current latest payment plan ID
  const allPlans = queryPlanDePaiement(state);
  const currentPlan = allPlans
    .filter(p => p.mutationId === mutationId)
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    [0];
  const currentId = currentPlan ? currentPlan.id : null;

  if (idFromDecision !== currentId) {
      toast.error("L'état du plan de paiement a changé. Veuillez recalculer et prendre une nouvelle décision.");
      return state;
  }

  // 3. Logic to create the final event
  const { payload } = decisionEvent;
  const { mutationType, detailCalcul, periodeDroits, periodeModifications } = payload;
  
  const newPlanDePaiementId = crypto.randomUUID();

  let finalEvent: PlanDeCalculValideEvent;

  if (mutationType === 'DROITS') {
    // --- DROITS: The event contains the full payment plan to replace the old one ---
    finalEvent = {
        id: crypto.randomUUID(),
        type: 'PLAN_DE_CALCUL_VALIDE',
        mutationId,
        timestamp: new Date().toISOString(),
        payload: {
            planDePaiementId: newPlanDePaiementId,
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
          planDePaiementId: newPlanDePaiementId,
          paiements: paiementsAPatcher
      }
    };
  }

  return { ...state, eventStream: [finalEvent, ...state.eventStream] };
}
