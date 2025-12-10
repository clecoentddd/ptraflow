"use client";

import { ValidatedPeriodsView } from "@/app/mutations/projection-periodes-de-droits/components/validated-periods-view";
import { AnalyzedPeriodView } from "@/app/mutations/projection-periodes-de-droits/components/analyzed-period-view";
import { AutoriserModificationDroitsButton } from "@/app/mutations/autoriser-modification-des-droits/components/autoriser-modification-des-droits-ui";
import { AnalyzeDroitsButton } from "@/app/mutations/analyze-droits/components/analyze-droits-ui";
import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { queryMutations } from "@/app/mutations/projection-mutations/projection";

export default function DroitsPage() {
  const { state } = useCqrs();
  const allMutations = queryMutations(state);
  const activeMutation = allMutations.find(m => m.status === 'EN_COURS' || m.status === 'OUVERTE');

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Droits</h1>
        {activeMutation && (
          <div className="flex gap-4">
            <AutoriserModificationDroitsButton mutationId={activeMutation.id} />
            <AnalyzeDroitsButton mutationId={activeMutation.id} />
          </div>
        )}
      </div>
      
      <div className="space-y-8">
        <div>
            <h2 className="text-xl font-semibold mb-4">Période en cours</h2>
            <AnalyzedPeriodView />
        </div>
        
        <div>
            <h2 className="text-xl font-semibold mb-4">Historique des périodes validées</h2>
            <ValidatedPeriodsView />
        </div>
      </div>
    </div>
  );
}
