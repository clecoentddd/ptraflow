
"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowRightCircle, Check, CheckCircle2, Circle } from "lucide-react";
import { queryTodos } from "../../projection-todolist/projection";
import type { ModificationRessourcesAutoriseeEvent } from "../../autoriser-modification-des-ressources/event";

export function ValiderModificationRessourcesTodoItem({ mutationId }: { mutationId: string }) {
    const { state } = useCqrs();
    const todos = queryTodos(state);
    const todo = todos.find(t => t.mutationId === mutationId && t.description === 'Valider la modification des ressources');

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

export function ValiderModificationRessourcesButton({ mutationId }: { mutationId: string }) {
    const { state, dispatch } = useCqrs();
    const todos = queryTodos(state);
    const todo = todos.find(t => t.mutationId === mutationId && t.description === 'Valider la modification des ressources');
    
    const handleClick = () => {
        // Find the corresponding authorization event to get the ressourceVersionId
        const authEvent = state.eventStream.find(
            e => e.mutationId === mutationId && e.type === 'MODIFICATION_RESSOURCES_AUTORISEE'
        ) as ModificationRessourcesAutoriseeEvent | undefined;

        if (!authEvent) {
            console.error("Could not find MODIFICATION_RESSOURCES_AUTORISEE event to validate.");
            return;
        }

        dispatch({ 
            type: 'VALIDER_MODIFICATION_RESSOURCES', 
            payload: { 
                mutationId,
                ressourceVersionId: authEvent.ressourceVersionId
            } 
        });
    };

    if (!todo) return null;

    const isTodo = todo.status === 'à faire';
    const isDone = todo.status === 'fait';

    const getVariant = () => {
        if (isTodo) return 'default';
        if (isDone) return 'secondary';
        return 'outline';
    }

    return (
         <Button 
            onClick={handleClick} 
            disabled={!isTodo}
            variant={getVariant()}
            className="w-full"
        >
            {isDone ? <Check className="mr-2 h-4 w-4" /> : <ArrowRight className="mr-2 h-4 w-4" />}
            Valider la modification des ressources
        </Button>
    )
}
