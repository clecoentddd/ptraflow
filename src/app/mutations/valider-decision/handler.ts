"use client";
    
import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { ValiderDecisionCommand } from './command';
import type { DecisionValideeEvent, DecisionDetail } from './event';
import { toast } from 'react-hot-toast';
import { queryDecisionsAPrendre } from '../projection-decision-a-prendre/projection';
import { queryMutations } from '../projection-mutations/projection';

// Command Handler
export function validerDecisionCommandHandler(state: AppState, command: ValiderDecisionCommand): AppState {
  const { mutationId, decisionId } = command.payload;
  
  const mutation = queryMutations(state).find(m => m.id === mutationId && m.status === 'EN_COURS');
  if (!mutation) {
      toast.error("La mutation n'est pas en cours ou n'existe pas.");
      return state;
  }
  
  const decision = queryDecisionsAPrendre(state).find(d => d.decisionId === decisionId);
  if (!decision || !decision.planDeCalcul) {
      toast.error("La décision à valider (avec un plan de calcul) n'a pas été trouvée.");
      return state;
  }
  
  const lastRessourceVersionIdEvent = [...mutation.history].reverse().find(e => 'ressourceVersionId' in e);
  if (!lastRessourceVersionIdEvent || !('ressourceVersionId' in lastRessourceVersionIdEvent)) {
      toast.error("Impossible de trouver la version de ressource (ressourceVersionId).");
      return state;
  }

  // --- Transform MonthlyResult into DecisionDetail ---
  const detailCalcul: DecisionDetail[] = decision.planDeCalcul.detail.map(monthlyResult => {
      const paiementsEffectues = 0; // Will be implemented later
      return {
          month: monthlyResult.month,
          calcul: monthlyResult.calcul,
          paiementsEffectues: paiementsEffectues,
          aPayer: monthlyResult.calcul - paiementsEffectues
      };
  });

  const event: DecisionValideeEvent = {
    id: crypto.randomUUID(),
    type: 'DECISION_VALIDEE',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        decisionId,
        mutationType: decision.mutationType,
        planDeCalculId: decision.planDeCalcul?.calculId,
        ressourceVersionId: lastRessourceVersionIdEvent.ressourceVersionId,
        detailCalcul: detailCalcul,
    }
  };

  return { ...state, eventStream: [event, ...state.eventStream] };
}
