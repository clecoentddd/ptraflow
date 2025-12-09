
"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowRightCircle, Check, CheckCircle2, Circle } from "lucide-react";
import { queryTodos } from "../../projection-todolist/projection";

export function ValiderPlanPaiementTodoItem({ mutationId }: { mutationId: string }) {
    const { state } = useCqrs();
    const todos = queryTodos(state);
    const todo = todos.find(t => t.mutationId === mutationId && t.description === 'Valider le plan de paiement');

    if (!todo) return null;

    const Icon = () => {
        switch (todo.status) {
            case 'fait': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
            case 'à faire': return <ArrowRightCircle className="h-5 w-5 text-primary animate-pulse" />;
            default: return <Circle className="h-5 w-5" />;
        }
    }
    
    return (
        <li className={cn("flex items-center gap-3 text-sm transition-colors",
            todo.status === 'fait' ? "text-foreground" : "text-muted-foreground",
            todo.status === 'à faire' && "font-semibold text-primary"
        )}>
            <Icon />
            <span>{todo.description}</span>
        </li>
    )
}

// This button is no longer needed as the process is now automated.
// A DECISION_VALIDEE event automatically triggers the `validerPlanPaiementCommandHandler`.
export function ValiderPlanPaiementButton({ mutationId }: { mutationId: string }) {
   return null;
}
