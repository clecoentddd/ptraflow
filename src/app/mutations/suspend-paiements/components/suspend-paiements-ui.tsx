"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowRightCircle, CheckCircle2, Circle } from "lucide-react";

export function SuspendPaiementsTodoItem({ mutationId }: { mutationId: string }) {
    const { state } = useCqrs();
    const todo = state.todos.find(t => t.mutationId === mutationId && t.description === 'Suspendre les paiements');

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

export function SuspendPaiementsButton({ mutationId }: { mutationId: string }) {
    const { state, dispatch } = useCqrs();
    const todo = state.todos.find(t => t.mutationId === mutationId && t.description === 'Suspendre les paiements');
    
    const handleClick = () => {
        dispatch({ type: 'SUSPEND_PAIEMENTS', payload: { mutationId } });
    };

    return (
         <Button onClick={handleClick} disabled={todo?.status !== 'à faire'} className="w-full">
            Suspendre les paiements
            <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
    )
}
