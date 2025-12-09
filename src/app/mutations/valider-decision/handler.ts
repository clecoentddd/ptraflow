"use client";
    
import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { ValiderDecisionCommand } from './command';
import type { DecisionValideeEvent, DecisionDetail } from './event';
import { toast } from 'react-hot-toast';
import { queryDecisionsAPrendre } from '../projection-decision-a-prendre/projection';
import { queryMutations } from '../projection-mutations/projection';

// Command Handler
export function validerDecisionCommandHandler(
    state: AppState, 
    command: ValiderDecisionCommand,
    dispatch: (event: AppEvent) => void
): void {
  const { mutationId, decisionId } = command.payload;
  
  const mutation = queryMutations(state).find(m => m.id === mutationId && m.status === 'EN_COURS');
  if (!mutation) {
      toast.error("La mutation n'est pas en cours ou n'existe pas.");
      return;
  }
  
  const decision = queryDecisionsAPrendre(state).find(d => d.mutationId === mutationId);
  if (!decision || !decision.planDeCalcul) {
      toast.error("La décision à valider (avec un plan de calcul) n'a pas été trouvée.");
      return;
  }
  
  const lastRessourceVersionIdEvent = [...mutation.history].reverse().find(e => 'ressourceVersionId' in e);
  if (!lastRessourceVersionIdEvent || !('ressourceVersionId' in lastRessourceVersionIdEvent)) {
      toast.error("Impossible de trouver la version de ressource (ressourceVersionId).");
      return;
  }

  // --- Transform MonthlyResult into DecisionDetail ---
  // Pour une mutation de RESSOURCES, on ne prend que les mois qui sont dans le plan de calcul
  // Pour une mutation de DROITS, on prend tout
  let detailSource = decision.planDeCalcul.detail;
  if (decision.mutationType === 'RESSOURCES') {
      const moisDuCalcul = new Set(decision.planDeCalcul.detail.map(d => d.month));
      detailSource = detailSource.filter(d => moisDuCalcul.has(d.month));
  }
  
  const detailCalcul: DecisionDetail[] = detailSource.map(monthlyResult => {
      // Règle métier : les montants négatifs (remboursements) sont conservés.
      return {
          month: monthlyResult.month,
          calcul: monthlyResult.calcul,
          paiementsEffectues: monthlyResult.paiementsEffectues,
          aPayer: monthlyResult.aPayer
      };
  });


  const event: DecisionValideeEvent = {
    id: crypto.randomUUID(),
    type: 'DECISION_VALIDEE',
    mutationId,
    decisionId: decision.decisionId,
    ressourceVersionId: lastRessourceVersionIdEvent.ressourceVersionId,
    planDePaiementId: decision.planDePaiementId || crypto.randomUUID(), // Ensure we always have an ID
    timestamp: new Date().toISOString(),
    payload: {
        mutationType: decision.mutationType,
        periodeDroits: decision.periodeDroits,
        periodeModifications: decision.periodeModifications,
        detailCalcul: detailCalcul,
    }
  };

  dispatch(event);
}
