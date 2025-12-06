
"use client";

import { useCqrs, type TodoStatus, type Todo } from "@/app/mutations/mutation-lifecycle/cqrs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { queryTodos } from "../../projection-todolist/projection";
import { queryMutations } from "../../projection-mutations/projection";
import { Gem, Users } from "lucide-react";
import type { Mutation, MutationType } from "../domain";

const statusStyles: Record<TodoStatus, string> = {
    'à faire': 'bg-yellow-500 text-black animate-pulse',
    'fait': 'bg-green-500 text-white',
    'en attente': 'bg-gray-400 text-white',
};

const taskOrder: Record<string, number> = {
    "Suspendre les paiements": 1,
    "Autoriser la modification de droits": 2,
    "Analyser les droits": 3,
    "Autoriser la modification de ressources": 4,
    "Valider la modification des ressources": 5,
    "Calculer le plan": 6,
    "Valider la mutation": 7,
};

const statusOrder: Record<TodoStatus, number> = {
    'à faire': 1,
    'en attente': 2,
    'fait': 3,
};

const typeDetails: Record<MutationType, { title: string, icon: React.ElementType }> = {
    DROITS: { title: "Mutation de droits", icon: Users },
    RESSOURCES: { title: "Mutation de ressources", icon: Gem }
};

interface GroupedTodo {
    mutation: Mutation;
    todos: Todo[];
}

export function TodoListView() {
    const { state } = useCqrs();
    const allTodos = queryTodos(state);
    const allMutations = queryMutations(state);

    if (allMutations.length === 0) {
        return (
             <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">Aucune tâche à afficher.</p>
            </Card>
        );
    }
    
    // We group todos by all mutations (active and completed)
    const groupedTodos = allMutations.map(mutation => ({
        mutation,
        todos: allTodos
            .filter(todo => todo.mutationId === mutation.id)
            .sort((a, b) => {
                const orderA = taskOrder[a.description] ?? 99;
                const orderB = taskOrder[b.description] ?? 99;
                if (orderA !== orderB) return orderA - orderB;
                const statusOrderA = statusOrder[a.status] ?? 99;
                const statusOrderB = statusOrder[b.status] ?? 99;
                return statusOrderA - statusOrderB;
            }),
    })).filter(group => group.todos.length > 0);

    if (groupedTodos.length === 0) {
         return (
            <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">Aucune tâche à afficher.</p>
            </Card>
        );
    }

    // Default to the first (most recent) mutationId
    const firstMutationId = groupedTodos.length > 0 ? groupedTodos[0].mutation.id : undefined;

    return (
        <Card>
            <CardContent className="p-0">
                 <Accordion type="single" collapsible defaultValue={firstMutationId} className="w-full">
                    {groupedTodos.map(({ mutation, todos }) => {
                        const details = typeDetails[mutation.type] || { title: "Mutation", icon: Users };
                        const Icon = details.icon;
                        return (
                            <AccordionItem value={mutation.id} key={mutation.id} className="border-b last:border-b-0">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline md:px-6">
                                    <div className="flex flex-col items-start text-left">
                                        <div className="flex items-center gap-2">
                                            <Icon className="h-5 w-5 text-muted-foreground" />
                                            <span className="font-semibold text-base">{details.title}</span>
                                        </div>
                                        <span className="font-mono text-xs text-muted-foreground">{mutation.id}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pb-2 md:px-4 md:pb-4">
                                    <ul className="space-y-2">
                                        {todos.map((todo) => (
                                            <li key={todo.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                                <span className="font-medium text-sm">{todo.description}</span>
                                                <Badge className={cn("capitalize text-xs", statusStyles[todo.status])}>
                                                    {todo.status}
                                                </Badge>
                                            </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            </CardContent>
        </Card>
    );
}
