
"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { queryJournal } from "../projection";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function JournalView() {
    const { state } = useCqrs();
    const journalEntries = queryJournal(state);

    if (journalEntries.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">Le journal des modifications est vide.</p>
            </Card>
        );
    }

    return (
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Mutation</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Détails</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {journalEntries.map((entry) => (
                        <TableRow key={entry.mutationId}>
                            <TableCell className="font-mono text-xs">{entry.mutationId}</TableCell>
                            <TableCell>
                                <Badge variant={entry.mutationType === 'DROITS' ? 'default' : 'secondary'}>
                                    {entry.mutationType}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {entry.mutationType === 'DROITS' ? (
                                    <p className="text-sm">
                                        Période de droits: <span className="font-semibold">{entry.droitsDateDebut || 'N/A'}</span> au <span className="font-semibold">{entry.droitsDateFin || 'N/A'}</span>
                                    </p>
                                ) : (
                                     <div className="flex flex-col gap-1 text-sm">
                                         {(entry.ressourcesDateDebut || entry.ressourcesDateFin) && (
                                            <p className="text-sm">
                                                Période des modifications: <span className="font-semibold">{entry.ressourcesDateDebut || '...'}</span> au <span className="font-semibold">{entry.ressourcesDateFin || '...'}</span>
                                            </p>
                                         )}
                                     </div>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}
