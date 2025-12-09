
"use client";
    
import type { AppState, AppEvent } from '../mutation-lifecycle/domain';
import type { ValiderDecisionCommand } from './command';
import type { DecisionValideeEvent, DecisionDetail } from './event';
import { toast } from 'react-hot-toast';
import { queryDecisionsAPrendre } from '../projection-decision-a-prendre/projection';
import { queryMutations } from '../projection-mutations/projection';
import { publishEvent } from '../mutation-lifecycle/event-bus';
import { queryJournal } from '../projection-journal/projection';

// Command Handler
export function validerDecisionCommandHandler(
    state: AppState, 
    command: ValiderDecisionCommand
): void {
  const { mutationId, decisionId } = command.payload;
  
  const mutation = queryMutations(state).find(m => m.id === mutationId && m.status === 'EN_COURS');
  if (!mutation) {
      toast.error("La mutation n'est pas en cours ou n'existe pas.");
      return;
  }
  
  const decision = queryDecisionsAPrendre(state).find(d => d.decisionId === decisionId && d.mutationId === mutationId);
  if (!decision || !decision.detail) {
      toast.error("La décision à valider (avec un détail de calcul) n'a pas été trouvée.");
      return;
  }

  const journalEntry = queryJournal(state).find(j => j.mutationId === mutationId);
    if (!journalEntry) {
        toast.error("L'entrée de journal correspondante à la mutation n'a pas été trouvée.");
        return;
    }
  
  const lastRessourceVersionIdEvent = [...mutation.history].reverse().find(e => 'ressourceVersionId' in e);
  if (!lastRessourceVersionIdEvent || !('ressourceVersionId' in lastRessourceVersionIdEvent)) {
      toast.error("Impossible de trouver la version de ressource (ressourceVersionId).");
      return;
  }
  
  const event: DecisionValideeEvent = {
    id: crypto.randomUUID(),
    type: 'DECISION_VALIDEE',
    mutationId,
    decisionId: decision.decisionId,
    ressourceVersionId: lastRessourceVersionIdEvent.ressourceVersionId,
    planDePaiementId: decision.planDePaiementId || crypto.randomUUID(), // Ensure we always have an ID
    timestamp: new Date().toISOString(),
    payload: {
        mutationType: journalEntry.mutationType,
        periodeDroits: journalEntry.droitsDateDebut && journalEntry.droitsDateFin 
            ? { dateDebut: journalEntry.droitsDateDebut, dateFin: journalEntry.droitsDateFin }
            : undefined,
        periodeModifications: journalEntry.ressourcesDateDebut && journalEntry.ressourcesDateFin
            ? { dateDebut: journalEntry.ressourcesDateDebut, dateFin: journalEntry.ressourcesDateFin }
            : undefined,
        detailCalcul: decision.detail,
    }
  };

  publishEvent(event);
}
