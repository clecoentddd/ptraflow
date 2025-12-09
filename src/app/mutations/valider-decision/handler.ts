
"use client";
    
import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { ValiderDecisionCommand } from './command';
import type { DecisionValideeEvent, DecisionDetail } from './event';
import { toast } from 'react-hot-toast';
import { queryDecisionsAPrendre } from '../projection-decision-a-prendre/projection';
import { publishEvent } from '../mutation-lifecycle/event-bus';

// Command Handler
export function validerDecisionCommandHandler(
    state: AppState, 
    command: ValiderDecisionCommand
): void {
  const { mutationId, decisionId } = command.payload;
  
  const decisionAPrendre = queryDecisionsAPrendre(state).find(d => d.decisionId === decisionId && d.mutationId === mutationId);
  if (!decisionAPrendre) {
      toast.error("La décision à valider n'a pas été trouvée.");
      return;
  }
  
  const event: DecisionValideeEvent = {
    id: crypto.randomUUID(),
    type: 'DECISION_VALIDEE',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        decisionId: decisionAPrendre.decisionId,
        ressourceVersionId: decisionAPrendre.ressourceVersionId,
        planDePaiementId: decisionAPrendre.planDePaiementId || crypto.randomUUID(),
        mutationType: decisionAPrendre.mutationType,
        periodeDroits: decisionAPrendre.periodeDroits,
        periodeModifications: decisionAPrendre.periodeModifications,
        detailCalcul: decisionAPrendre.detail,
    }
  };

  publishEvent(event);
}
