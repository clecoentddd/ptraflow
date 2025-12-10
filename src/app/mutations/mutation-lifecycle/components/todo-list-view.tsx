
"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import type { TodoStatus, Todo } from "@/app/mutations/domain";
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
import { Gem, Users, CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import type { Mutation, MutationType } from "../domain";
import { taskOrder } from "../constants";
import Link from "next/link";

const statusStyles: Record<TodoStatus, string> = {
    'à faire': 'bg-yellow-500 text-black animate-pulse',
    'fait': 'bg-green-500 text-white',
    'en attente': 'bg-gray-400 text-white',
    'annulée': 'bg-destructive/80 text-destructive-foreground',
};

const statusOrder: Record<TodoStatus, number> = {
    'à faire': 1,
    'en attente': 2,
    'fait': 3,
    'annulée': 4,
};

const typeDetails: Record<MutationType, { title: string, icon: React.ElementType }> = {
    DROITS: { title: "Mutation de droits", icon: Users },
    RESSOURCES: { title: "Mutation de ressources", icon: Gem }
};

const taskToRoute: Record<string, string> = {
    "Suspendre les paiements": "/",
    "Autoriser la modification de droits": "/droits",
    "Analyser les droits": "/droits",
    "Autoriser la modification de ressources": "/ecritures",
    "Valider la modification des ressources": "/ecritures",
    "Calculer le plan": "/calcul",
    "Préparer la décision": "/decision",
    "Valider la décision": "/decision",
    "Valider le plan de paiement": "/paiement",
    "Préparer les transactions": "/paiement",
    "Exécuter les transactions": "/paiement"
};

interface GroupedTodo {
    mutation: Mutation;
    todos: Todo[];
}

export function MutationStepsNav() {
    const { state } = useCqrs();
    const allMutations = queryMutations(state);
    const allTodos = queryTodos(state);

    // Find the first active mutation
    const activeMutation = allMutations.find(m => m.status === 'EN_COURS' || m.status === 'OUVERTE');

    if (!activeMutation) {
        return null; 
    }

    const mutationTodos = allTodos
        .filter(todo => todo.mutationId === activeMutation.id)
        .sort((a, b) => {
            const orderA = taskOrder[a.description] ?? 99;
            const orderB = taskOrder[b.description] ?? 99;
            return orderA - orderB;
        });

    return (
        <div className="w-full bg-muted/30 border-b p-4">
            <div className="container mx-auto">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-lg">
                                {activeMutation.type === 'DROITS' ? 'Mutation de droits' : 'Mutation de ressources'}
                            </h3>
                            <div className="text-xs text-muted-foreground flex gap-2">
                                <span>{activeMutation.id}</span>
                                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 capitalize">
                                    {activeMutation.status.toLowerCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0 hidden md:block" />

                        <div className="flex justify-between items-start overflow-x-auto pb-2 md:pb-0 gap-4 md:gap-0">
                            {mutationTodos.map((todo, index) => {
                                let Icon = Circle;
                                let colorClass = "text-gray-400 bg-background border-gray-200";
                                let textColorClass = "text-muted-foreground";

                                if (todo.status === 'fait') {
                                    Icon = CheckCircle2;
                                    colorClass = "text-green-600 bg-green-50 border-green-600 z-10";
                                    textColorClass = "text-green-700 font-medium";
                                } else if (todo.status === 'à faire') {
                                    Icon = AlertCircle;
                                    colorClass = "text-yellow-600 bg-yellow-50 border-yellow-600 animate-pulse z-10";
                                    textColorClass = "text-yellow-700 font-bold";
                                } else if (todo.status === 'en attente') {
                                    Icon = Clock;
                                    colorClass = "text-gray-300 bg-background border-gray-200 z-10";
                                }

                                const route = taskToRoute[todo.description] || "#";
                                const isClickable = route !== "#";

                                return (
                                    <Link 
                                        key={todo.id} 
                                        href={route}
                                        className={cn(
                                            "flex flex-col items-center gap-2 min-w-[100px] z-10 relative group",
                                            isClickable ? "cursor-pointer hover:opacity-80" : "cursor-default"
                                        )}
                                    >
                                        <div className={cn("rounded-full p-1 border-2 transition-colors", colorClass)}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <span className={cn("text-[10px] text-center max-w-[120px] leading-tight", textColorClass)}>
                                            {todo.description}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
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
                                                <span className={cn("font-medium text-sm", todo.status === 'annulée' && "line-through text-muted-foreground")}>{todo.description}</span>
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
