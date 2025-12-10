"use client";

import { AllEcrituresListView } from "@/app/mutations/ecritures/components/ecritures-list-ui";
import { AutoriserModificationRessourcesButton } from "@/app/mutations/autoriser-modification-des-ressources/components/autoriser-modification-ressources-ui";
import { ValiderModificationRessourcesButton } from "@/app/mutations/valider-modification-ressources/components/valider-modification-ressources-ui";
import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { queryMutations } from "@/app/mutations/projection-mutations/projection";

export default function EcrituresPage() {
  const { state } = useCqrs();
  const allMutations = queryMutations(state);
  const activeMutation = allMutations.find(m => m.status === 'EN_COURS' || m.status === 'OUVERTE');

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Écritures</h1>
        {activeMutation && (
          <div className="flex gap-4">
            <AutoriserModificationRessourcesButton mutationId={activeMutation.id} />
            <ValiderModificationRessourcesButton mutationId={activeMutation.id} />
          </div>
        )}
      </div>
      <p className="text-muted-foreground mb-8">Liste des écritures comptables.</p>
      <AllEcrituresListView />
    </div>
  );
}
