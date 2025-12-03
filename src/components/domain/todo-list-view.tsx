
"use client";

import { useCqrs, type Todo } from "@/lib/cqrs.tsx";
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

const statusStyles: Record<Todo['status'], string> = {
    'à faire': 'bg-yellow-500 text-black',
    'fait': 'bg-green-500 text-white',
};

export function TodoListView() {
    const { state } = useCqrs();

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
                        <TableHead>Mutation ID</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Statut</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {state.todos.map((todo) => (
                        <TableRow key={todo.id}>
                            <TableCell className="font-mono text-xs">{todo.mutationId}</TableCell>
                            <TableCell>{todo.description}</TableCell>
                            <TableCell>
                                <Badge className={cn("capitalize", statusStyles[todo.status])}>
                                    {todo.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}
