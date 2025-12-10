"use client";

import { PlanCalculView } from "@/app/mutations/projection-plan-calcul/components/plan-calcul-view";
import { CalculerPlanButton } from "@/app/mutations/calculer-plan/components/calculer-plan-ui";
import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { queryMutations } from "@/app/mutations/projection-mutations/projection";

export default function CalculPage() {
  const { state } = useCqrs();
  const allMutations = queryMutations(state);
  const activeMutation = allMutations.find(m => m.status === 'EN_COURS' || m.status === 'OUVERTE');

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Calcul</h1>
        {activeMutation && (
          <div className="flex gap-4">
            <CalculerPlanButton mutationId={activeMutation.id} />
          </div>
        )}
      </div>
      <p className="text-muted-foreground mb-8">Plan de calcul et simulation.</p>
      <PlanCalculView />
    </div>
  );
}
