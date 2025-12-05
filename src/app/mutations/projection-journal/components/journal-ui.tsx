
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
                                        Période de droits: <span className="font-semibold">{entry.dateDebut || 'N/A'}</span> au <span className="font-semibold">{entry.dateFin || 'N/A'}</span>
                                    </p>
                                ) : (
                                     <div className="flex gap-4 text-sm">
                                        <p>Revenus: <span className="font-semibold text-green-600">+{entry.addedRevenus}</span></p>
                                        <p>Dépenses: <span className="font-semibold text-blue-600">+{entry.addedDepenses}</span></p>
                                        <p>Suppressions: <span className="font-semibold text-red-600">-{entry.deletedEcritures}</span></p>
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
