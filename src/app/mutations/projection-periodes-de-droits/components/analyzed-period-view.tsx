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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { queryAnalyzedPeriods } from "../projection";
import { queryMutations } from "../../projection-mutations/projection";

export function AnalyzedPeriodView() {
    const { state } = useCqrs();
    const analyzedPeriods = queryAnalyzedPeriods(state);
    const allMutations = queryMutations(state);
    const activeMutation = allMutations.find(m => m.status === 'EN_COURS' || m.status === 'OUVERTE');

    if (!activeMutation) {
        return null;
    }

    const currentAnalyzedPeriod = analyzedPeriods.find(p => p.mutationId === activeMutation.id);

    if (!currentAnalyzedPeriod) {
        return (
             <Card className="mb-6 border-dashed">
                <CardContent className="flex items-center justify-center h-24">
                    <p className="text-muted-foreground">Aucune période de droits en cours d'analyse.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardHeader>
                <CardTitle className="text-lg text-blue-700 dark:text-blue-300">Période de droits en cours d'analyse</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <div className="grid gap-1">
                        <p className="text-sm font-medium leading-none">Date de début</p>
                        <p className="text-sm text-muted-foreground">{currentAnalyzedPeriod.dateDebut}</p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div className="grid gap-1">
                        <p className="text-sm font-medium leading-none">Date de fin</p>
                        <p className="text-sm text-muted-foreground">{currentAnalyzedPeriod.dateFin}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
