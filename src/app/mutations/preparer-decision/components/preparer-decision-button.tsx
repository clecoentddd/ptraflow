"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { Button } from "@/components/ui/button";
import { queryTodos } from "../../projection-todolist/projection";
import type { PlanCalculeEvent } from "@/app/mutations/calculer-plan/event";

export function PreparerDecisionButton({ mutationId }: { mutationId: string }) {
    const { state, dispatchEvent } = useCqrs();
    const todos = queryTodos(state);
    const todo = todos.find(t => t.mutationId === mutationId && t.description === 'Préparer la décision');
    
    const calculEvent = state.eventStream.find(e => 
        e.type === 'PLAN_CALCUL_EFFECTUE' && e.mutationId === mutationId
    ) as PlanCalculeEvent | undefined;

    const handleClick = () => {
        if (!calculEvent) return;
        dispatchEvent({ 
            type: 'PREPARER_DECISION', 
            payload: { 
                mutationId,
                calculId: calculEvent.payload.calculId
            }
        });
    };

    if (!todo) return null;

    const isTodo = todo.status === 'à faire';
    const isDone = todo.status === 'fait';

    if (!isTodo && !isDone) return null;

    return (
        <Button 
            onClick={handleClick} 
            disabled={!isTodo || !calculEvent}
            variant={isTodo ? "default" : "outline"}
            size="sm"
        >
            {isDone ? "Décision préparée" : "Préparer la décision"}
        </Button>
    );
}
