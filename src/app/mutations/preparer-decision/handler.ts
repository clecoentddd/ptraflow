
"use client";
    
import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { PreparerDecisionCommand } from './command';
import type { DecisionPreparteeEvent } from './event';
import { toast } from 'react-hot-toast';
import { queryJournal } from '../projection-journal/projection';
import { queryPlansDeCalcul } from '../projection-plan-calcul/projection';
import { queryPlanDePaiement } from '../projection-plan-de-paiement/projection';
import { queryTransactions } from '../projection-transactions/projection';
import { queryDecisionsAPrendre } from '../projection-decision-a-prendre/projection';
import { parse } from 'date-fns';
import { publishEvent } from '../mutation-lifecycle/event-bus';

// Command Handler (Process Manager)
export function preparerDecisionCommandHandler(
    state: AppState, 
    command: PreparerDecisionCommand
): void {
  const { mutationId, calculId } = command.payload;
  
  // --- 1. Gather all necessary data from projections ---
  const journalEntries = queryJournal(state);
  const journalEntry = journalEntries.find(j => j.mutationId === mutationId);
  const plansDeCalcul = queryPlansDeCalcul(state);
  const planDeCalcul = plansDeCalcul.find(p => p.calculId === calculId);
  const allPlansDePaiement = queryPlanDePaiement(state);
  const allTransactions = queryTransactions(state);
  const existingDecisions = queryDecisionsAPrendre(state);

  // --- 2. Validations to ensure we can proceed ---
  if (!journalEntry || !planDeCalcul) {
    console.error("--- DEBUG: preparerDecisionCommandHandler ---");
    console.log("Mutation ID:", mutationId);
    console.log("Calcul ID:", calculId);
    console.log("Journal trouvé:", journalEntry);
    console.log("Plan de calcul trouvé:", planDeCalcul);
    console.log("Toutes les entrées du journal:", JSON.stringify(journalEntries, null, 2));
    console.log("Tous les plans de calcul:", JSON.stringify(plansDeCalcul, null, 2));
    console.error("-------------------------------------------");
    toast.error("Données de journal ou de calcul manquantes pour préparer la décision.");
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

  // --- 3. Business Logic: Reconciliation ---
  const latestPlanDePaiement = [...allPlansDePaiement].sort(
    (a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];
  const latestPlanDePaiementId = latestPlanDePaiement ? latestPlanDePaiement.id : null;

  const transactionsExecutees = allTransactions.filter(t => t.statut === 'Exécuté');
  const paiementsParMois: Record<string, number> = {};
  transactionsExecutees.forEach(tx => {
      paiementsParMois[tx.mois] = (paiementsParMois[tx.mois] || 0) + tx.montant;
  });

  let moisAConsiderer: string[];
  if (journalEntry.mutationType === 'RESSOURCES' && journalEntry.ressourcesDateDebut && journalEntry.ressourcesDateFin) {
      moisAConsiderer = planDeCalcul.detail.map(d => d.month);
  } else {
      const allMonths = new Set([...Object.keys(paiementsParMois), ...planDeCalcul.detail.map(d => d.month)]);
      moisAConsiderer = Array.from(allMonths).sort((a,b) => parse(a, 'MM-yyyy', new Date()).getTime() - parse(b, 'MM-yyyy', new Date()).getTime());
  }

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

  // --- 4. Create the event ---
  const event: DecisionPreparteeEvent = {
    id: crypto.randomUUID(),
    type: 'DECISION_PREPAREE',
    mutationId,
    timestamp: new Date().toISOString(),
    payload: {
        decisionId: crypto.randomUUID(),
        calculId: planDeCalcul.calculId,
        ressourceVersionId: ressourceVersionId,
        planDePaiementId: latestPlanDePaiementId,
        mutationType: journalEntry.mutationType,
        periodeDroits: journalEntry.droitsDateDebut && journalEntry.droitsDateFin 
            ? { dateDebut: journalEntry.droitsDateDebut, dateFin: journalEntry.droitsDateFin }
            : undefined,
        periodeModifications: journalEntry.ressourcesDateDebut && journalEntry.ressourcesDateFin
            ? { dateDebut: journalEntry.ressourcesDateDebut, dateFin: journalEntry.ressourcesDateFin }
            : undefined,
        detail: detailAvecPaiements
    }
  };

  publishEvent(event);
}
