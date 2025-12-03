
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

    // Afficher les 5 périodes les plus récentes, de la plus récente à la plus ancienne.
    const recentValidatedPeriods = [...validatedPeriods].reverse().slice(0, 5);

    if (recentValidatedPeriods.length === 0) {
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
                        <TableHead>Période</TableHead>
                        <TableHead>ID de la Mutation</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recentValidatedPeriods.map((period, index) => (
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
