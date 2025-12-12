"use client";
    
import type { AppState } from '../mutation-lifecycle/domain';
import type { PreparerDecisionDroitsCommand } from './command';
import type { DecisionDroitsPrepareeEvent } from './event';
import { toast } from 'react-hot-toast';
import { queryPlansDeCalcul } from '../projection-plan-calcul/projection';
import { queryPlanDePaiement } from '../projection-plan-de-paiement/projection';
import { queryTransactions } from '../projection-transactions/projection';
import { queryDecisionsAPrendre } from '../projection-decision-a-prendre/projection';
import { parse } from 'date-fns';
import { publishEvent } from '../mutation-lifecycle/event-bus';
import { queryMutations } from '../projection-mutations/projection';
import type { DroitsAnalysesEvent } from '../analyze-droits/event';

export function preparerDecisionDroitsCommandHandler(
    state: AppState, 
    command: PreparerDecisionDroitsCommand
): void {
  const { mutationId, calculId } = command.payload;
  
  const mutation = queryMutations(state).find(m => m.id === mutationId);
  const planDeCalcul = queryPlansDeCalcul(state).find(p => p.calculId === calculId);
  const allPlansDePaiement = queryPlanDePaiement(state);
  const allTransactions = queryTransactions(state);
  const existingDecisions = queryDecisionsAPrendre(state);

  if (!mutation || !planDeCalcul) {
    toast.error("Données de mutation ou de calcul manquantes pour préparer la décision.");
    return;
  }
  if (existingDecisions.some(d => d.calculId === calculId)) {
    console.log(`Une décision pour le calcul ${calculId} a déjà été préparée.`);
    return;
  }
  
  const lastRessourceVersionIdEvent = [...state.eventStream].reverse().find(e => 'ressourceVersionId' in e && e.mutationId === mutationId);
  if (!lastRessourceVersionIdEvent || !('ressourceVersionId' in lastRessourceVersionIdEvent)) {
      toast.error("Impossible de trouver la version de ressource (ressourceVersionId).");
      return;
  }
  const ressourceVersionId = lastRessourceVersionIdEvent.ressourceVersionId;

  // --- Determine Periods (Droits Specific) ---
  let periodeDroits: { dateDebut: string; dateFin: string } | undefined;
  const droitsAnalysesEvent = mutation.history.find(e => e.type === 'DROITS_ANALYSES') as DroitsAnalysesEvent | undefined;
  if (droitsAnalysesEvent) {
      periodeDroits = { 
          dateDebut: droitsAnalysesEvent.payload.dateDebut,
          dateFin: droitsAnalysesEvent.payload.dateFin
      };
  }

  // --- Business Logic: Global Reconciliation ---
  const latestPlanDePaiement = [...allPlansDePaiement].sort(
    (a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];
  const latestPlanDePaiementId = latestPlanDePaiement ? latestPlanDePaiement.id : null;

  const transactionsExecutees = allTransactions.filter(t => t.statut === 'Exécuté');
  const paiementsParMois: Record<string, number> = {};
  transactionsExecutees.forEach(tx => {
      paiementsParMois[tx.mois] = (paiementsParMois[tx.mois] || 0) + tx.montant;
  });

  // Global View: All months from payments AND calculation
  const allMonths = new Set([...Object.keys(paiementsParMois), ...planDeCalcul.detail.map(d => d.month)]);
  const moisAConsiderer = Array.from(allMonths).sort((a,b) => parse(a, 'MM-yyyy', new Date()).getTime() - parse(b, 'MM-yyyy', new Date()).getTime());

  const detailAvecPaiements = moisAConsiderer.map(month => {
      const calculDuMois = planDeCalcul.detail.find(d => d.month === month);
      const montantCalcule = calculDuMois ? calculDuMois.calcul : 0;
      const paiementsEffectues = paiementsParMois[month] || 0;
      const aPayer = montantCalcule - paiementsEffectues;

      return {
          ...(calculDuMois || { month, revenus: 0, depenses: 0, resultat: 0, calcul: 0 }),
          paiementsEffectues,
          aPayer
      };
  });

  const event: DecisionDroitsPrepareeEvent = {
    id: crypto.randomUUID(),
    type: 'DECISION_DROITS_PREPAREE',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        decisionId: crypto.randomUUID(),
        calculId: planDeCalcul.calculId,
        ressourceVersionId: ressourceVersionId,
        planDePaiementId: latestPlanDePaiementId,
        mutationType: mutation.type,
        periodeDroits,
        detail: detailAvecPaiements
    }
  };

  publishEvent(event);
}
