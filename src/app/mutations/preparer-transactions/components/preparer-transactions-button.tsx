"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { Button } from "@/components/ui/button";
import { queryTodos } from "../../projection-todolist/projection";
import type { PlanDePaiementValideEvent } from "@/app/mutations/valider-plan-paiement/event";

export function PreparerTransactionsButton({ mutationId }: { mutationId: string }) {
    const { state, dispatchEvent } = useCqrs();
    // Note: "Préparer les transactions" isn't explicitly in the todo list in the current domain model,
    // but it's the logical next step after validating the payment plan.
    // We can check if the payment plan is validated for this mutation.
    
    const planValideEvent = state.eventStream.find(e => 
        e.type === 'PLAN_DE_PAIEMENT_VALIDE' && e.mutationId === mutationId
    ) as PlanDePaiementValideEvent | undefined;

    // Check if transactions are already prepared (to disable button)
    // This is a simplification, ideally we'd check the specific projection
    const transactionsPrepared = state.eventStream.some(e => 
        e.type === 'TRANSACTION_CREEE' && e.mutationId === mutationId
    );

    const handleClick = () => {
        if (!planValideEvent) return;
        dispatchEvent({ 
            type: 'PREPARER_TRANSACTIONS', 
            payload: { 
                mutationId,
                planDePaiementId: planValideEvent.id
            }
        });
    };

    if (!planValideEvent) return null;

    return (
        <Button 
            onClick={handleClick} 
            disabled={transactionsPrepared}
            variant={!transactionsPrepared ? "default" : "outline"}
            size="sm"
        >
            {transactionsPrepared ? "Transactions préparées" : "Préparer les transactions"}
        </Button>
    );
}
