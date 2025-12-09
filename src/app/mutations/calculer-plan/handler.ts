
"use client";
    
import type { AppState } from '../mutation-lifecycle/domain';
import type { ValiderPlanCalculCommand } from './command';
import type { PlanCalculeEvent } from './event';
import { toast } from 'react-hot-toast';
import { queryMutations } from '../projection-mutations/projection';
import { publishEvent } from '../mutation-lifecycle/event-bus';
import { queryJournal } from '../projection-journal/projection';
import type { DroitsAnalysesEvent } from '../analyze-droits/event';
import { calculatePlan } from '../shared/plan-de-calcul.service';

// Command Handler
export function validerPlanCalculCommandHandler(
    state: AppState, 
    command: ValiderPlanCalculCommand
): void {
  const { mutationId } = command.payload;
  
  // --- This logic was previously in the UI component, it's now in the handler ---

  const mutation = queryMutations(state).find(m => m.id === mutationId && m.status === 'EN_COURS');
  if (!mutation) {
      toast.error("La mutation n'est pas en cours ou n'existe pas.");
      return;
  }
  
  // 1. Determine period
  let dateDebut: string | undefined;
  let dateFin: string | undefined;

  if (mutation.type === 'DROITS') {
      const droitsAnalysesEvent = [...state.eventStream].reverse().find(e => e.mutationId === mutationId && e.type === 'DROITS_ANALYSES') as DroitsAnalysesEvent | undefined;
      if (!droitsAnalysesEvent) {
          toast.error("Période de droits non trouvée pour cette mutation.");
          return;
      }
      dateDebut = droitsAnalysesEvent.payload.dateDebut;
      dateFin = droitsAnalysesEvent.payload.dateFin;
  } else { // RESSOURCES
      const journalEntry = queryJournal(state).find(j => j.mutationId === mutationId);
      if (!journalEntry?.ressourcesDateDebut || !journalEntry?.ressourcesDateFin) {
          toast.error("Période de modification des ressources non trouvée.");
          return;
      }
      dateDebut = journalEntry.ressourcesDateDebut;
      dateFin = journalEntry.ressourcesDateFin;
  }

  if (!dateDebut || !dateFin) {
      toast.error("Impossible de déterminer la période pour le calcul.");
      return;
  }
  
  const lastRessourceVersionIdEvent = [...mutation.history].reverse().find(e => 'ressourceVersionId' in e);
  if (!lastRessourceVersionIdEvent || !('ressourceVersionId' in lastRessourceVersionIdEvent)) {
      toast.error("Impossible de trouver un ressourceVersionId pour le calcul.");
      return;
  }
  const ressourceVersionId = lastRessourceVersionIdEvent.ressourceVersionId;

  // 2. Call the pure service
  const resultatDuCalcul = calculatePlan(state.ecritures, dateDebut, dateFin);

  // --- End of moved logic ---

  const event: PlanCalculeEvent = {
    id: crypto.randomUUID(),
    type: 'PLAN_CALCUL_EFFECTUE',
    mutationId,
    timestamp: new Date().toISOString(),
    ressourceVersionId,
    payload: {
        calculId: crypto.randomUUID(),
        detail: resultatDuCalcul,
    }
  };

  publishEvent(event);
}
