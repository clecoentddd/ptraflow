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

export function TodoListView() {
    const { state } = useCqrs();

    const sortedTodos = [...state.todos].sort((a, b) => {
        if (a.status === 'à faire') return -1;
        if (b.status === 'à faire') return 1;
        if (a.status === 'fait' && b.status !== 'fait') return 1;
        if (b.status === 'fait' && a.status !== 'fait') return -1;
        return 0;
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
