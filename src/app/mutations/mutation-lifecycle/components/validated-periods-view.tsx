
"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

export function ValidatedPeriodsView() {
    const { state } = useCqrs();
    const { validatedPeriods } = state;

    if (validatedPeriods.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">Aucune période de droits n'a été validée.</p>
            </Card>
        );
    }

    return (
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Dernière Période Validée</TableHead>
                        <TableHead>ID de la Mutation</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {validatedPeriods.map((period, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-medium">{period.dateDebut} au {period.dateFin}</TableCell>
                            <TableCell className="font-mono text-xs">{period.mutationId}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}
