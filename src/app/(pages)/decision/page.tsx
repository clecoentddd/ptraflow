"use client";

import { DecisionAPrendreView } from "@/app/mutations/projection-decision-a-prendre/components/decision-a-prendre-view";
import { DecisionHistoryView } from "@/app/mutations/projection-decision-history/components/decision-history-view";
import { PreparerDecisionButton } from "@/app/mutations/preparer-decision/components/preparer-decision-button";
import { ValiderDecisionButton } from "@/app/mutations/valider-decision/components/valider-decision-ui";
import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { queryMutations } from "@/app/mutations/projection-mutations/projection";

export default function DecisionPage() {
  const { state } = useCqrs();
  const allMutations = queryMutations(state);
  const activeMutation = allMutations.find(m => m.status === 'EN_COURS' || m.status === 'OUVERTE');

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Décision</h1>
        {activeMutation && (
          <div className="flex gap-4">
            <PreparerDecisionButton mutationId={activeMutation.id} />
            <ValiderDecisionButton mutationId={activeMutation.id} />
          </div>
        )}
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Décision à prendre</h2>
        <DecisionAPrendreView />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Historique des décisions</h2>
        <DecisionHistoryView />
      </div>
    </div>
  );
}
