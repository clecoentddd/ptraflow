
"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowRightCircle, Check, CheckCircle2, Circle } from "lucide-react";

export function AuthorizeModificationTodoItem({ mutationId }: { mutationId: string }) {
    const { state } = useCqrs();
    const todo = state.todos.find(t => t.mutationId === mutationId && t.description === 'Autoriser la modification');

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

export function AuthorizeModificationButton({ mutationId }: { mutationId: string }) {
    const { state, dispatch } = useCqrs();
    const todo = state.todos.find(t => t.mutationId === mutationId && t.description === 'Autoriser la modification');
    
    const handleClick = () => {
        dispatch({ type: 'AUTHORIZE_MODIFICATION', payload: { mutationId } });
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
            Autoriser la modification
        </Button>
    )
}
