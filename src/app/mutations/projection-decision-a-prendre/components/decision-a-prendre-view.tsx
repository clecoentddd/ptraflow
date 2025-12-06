"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { queryDecisionsAPrendre } from "../projection";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { queryMutations } from "../../projection-mutations/projection";

export function DecisionAPrendreView() {
    const { state } = useCqrs();
    const decisions = queryDecisionsAPrendre(state);
    const mutations = queryMutations(state);

    const activeDecisions = decisions.filter(d => 
        mutations.some(m => m.id === d.mutationId && m.status === 'EN_COURS')
    );

    if (activeDecisions.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">Aucune décision à prendre pour le moment.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {activeDecisions.map((decision) => (
                <Card key={decision.mutationId}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>Décision pour la mutation - MUTATION DE {decision.mutationType}</CardTitle>
                                <CardDescription className="font-mono text-xs mt-1">
                                    DecisionId: {decision.decisionId}
                                </CardDescription>
                                <CardDescription className="font-mono text-xs mt-1">
                                    MutationId: {decision.mutationId}
                                </CardDescription>
                            </div>
                             <Badge variant={decision.mutationType === 'DROITS' ? 'default' : 'secondary'}>
                                {decision.mutationType}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {decision.planDeCalcul ? (
                             <div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-mono">Mois</TableHead>
                                            <TableHead className="text-right">Montant du calcul</TableHead>
                                            <TableHead className="text-right">Paiements effectués</TableHead>
                                            <TableHead className="text-right font-semibold">A payer / A rembourser</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {decision.planDeCalcul.detail.map((monthlyResult) => {
                                            const paiementsEffectues = 0; // Placeholder
                                            const aPayer = monthlyResult.calcul - paiementsEffectues;
                                            return (
                                                <TableRow key={monthlyResult.month}>
                                                    <TableCell className="font-mono">{monthlyResult.month}</TableCell>
                                                    <TableCell className="text-right">{monthlyResult.calcul.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">{paiementsEffectues.toFixed(2)}</TableCell>
                                                    <TableCell className={`text-right font-semibold ${aPayer >= 0 ? '' : 'text-destructive'}`}>
                                                        {aPayer.toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Aucun plan de calcul associé.</p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
