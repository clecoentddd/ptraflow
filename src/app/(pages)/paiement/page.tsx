"use client";

import { PlanDePaiementView } from "@/app/mutations/projection-plan-de-paiement/components/plan-de-paiement-view";
import { TransactionsView } from "@/app/mutations/projection-transactions/components/transactions-view";
import { PreparerTransactionsButton } from "@/app/mutations/preparer-transactions/components/preparer-transactions-button";
import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { queryMutations } from "@/app/mutations/projection-mutations/projection";

export default function PaiementPage() {
  const { state } = useCqrs();
  const allMutations = queryMutations(state);
  const activeMutation = allMutations.find(m => m.status === 'EN_COURS' || m.status === 'OUVERTE');

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Paiement</h1>
        {activeMutation && (
          <div className="flex gap-4">
             <PreparerTransactionsButton mutationId={activeMutation.id} />
          </div>
        )}
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Plan de paiement</h2>
        <PlanDePaiementView />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Transactions</h2>
        <TransactionsView />
      </div>
    </div>
  );
}
