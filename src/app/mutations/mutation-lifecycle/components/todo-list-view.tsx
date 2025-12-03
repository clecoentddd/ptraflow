
"use client";

import { useCqrs, type TodoStatus, type Todo } from "@/app/mutations/mutation-lifecycle/cqrs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const statusStyles: Record<TodoStatus, string> = {
    'à faire': 'bg-yellow-500 text-black animate-pulse',
    'fait': 'bg-green-500 text-white',
    'en attente': 'bg-gray-400 text-white',
};

const taskOrder: Record<string, number> = {
    "Suspendre les paiements": 1,
    "Autoriser la modification": 2,
    "Analyser les droits": 3,
    "Valider la mutation": 4,
};

const statusOrder: Record<TodoStatus, number> = {
    'à faire': 1,
    'en attente': 2,
    'fait': 3,
};


export function TodoListView() {
    const { state } = useCqrs();

    const sortedTodos = [...state.todos].sort((a, b) => {
        const orderA = taskOrder[a.description] ?? 99;
        const orderB = taskOrder[b.description] ?? 99;
        
        if (orderA !== orderB) {
            return orderA - orderB;
        }

        const statusOrderA = statusOrder[a.status] ?? 99;
        const statusOrderB = statusOrder[b.status] ?? 99;
        
        return statusOrderA - statusOrderB;
    });

    if (state.todos.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">Aucune tâche à faire.</p>
            </Card>
        );
    }

    return (
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Description</TableHead>

                        <TableHead>Statut</TableHead>
                        <TableHead>Mutation ID</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedTodos.map((todo) => (
                        <TableRow key={todo.id}>
                            <TableCell className="font-medium">{todo.description}</TableCell>
                            <TableCell>
                                <Badge className={cn("capitalize", statusStyles[todo.status])}>
                                    {todo.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{todo.mutationId}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}
