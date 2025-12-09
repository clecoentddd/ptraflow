
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

export function DecisionAPrendreView() {
    const { state } = useCqrs();
    const decisions = queryDecisionsAPrendre(state);

    if (decisions.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">Aucune décision à prendre pour le moment.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {decisions.map((decision) => {
                const mutationType = decision.mutationType;

                return (
                    <Card key={decision.mutationId}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Décision pour la mutation - MUTATION DE {mutationType}</CardTitle>
                                    <CardDescription className="font-mono text-xs mt-1">
                                        DecisionId: {decision.decisionId}
                                    </CardDescription>
                                    <CardDescription className="font-mono text-xs mt-1">
                                        MutationId: {decision.mutationId}
                                    </CardDescription>
                                    <CardDescription className="font-mono text-xs mt-1">
                                        CalculId: {decision.calculId}
                                    </CardDescription>
                                    <CardDescription className="font-mono text-xs mt-1">
                                        PlanDePaiementId: {decision.planDePaiementId || 'N/A'}
                                    </CardDescription>
                                </div>
                                <Badge variant={mutationType === 'DROITS' ? 'default' : 'secondary'}>
                                    {mutationType}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {decision.detail ? (
                                <>
                                    {/* Desktop View */}
                                    <div className="hidden md:block">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="font-mono w-1/4">Mois</TableHead>
                                                    <TableHead className="text-right w-1/4">Montant du calcul</TableHead>
                                                    <TableHead className="text-right w-1/4">Paiements effectués</TableHead>
                                                    <TableHead className="text-right font-semibold w-1/4">A payer / A rembourser</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {decision.detail.map((monthlyResult) => {
                                                    const { aPayer, calcul, paiementsEffectues } = monthlyResult;
                                                    return (
                                                        <TableRow key={monthlyResult.month}>
                                                            <TableCell className="font-mono">{monthlyResult.month}</TableCell>
                                                            <TableCell className="text-right">{calcul.toFixed(2)}</TableCell>
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
                                    {/* Mobile View */}
                                    <div className="md:hidden space-y-3">
                                        {decision.detail.map((monthlyResult) => {
                                            const { aPayer, calcul, paiementsEffectues } = monthlyResult;
                                            return (
                                                <div key={monthlyResult.month} className="p-3 rounded-lg border bg-muted/50">
                                                    <h4 className="font-mono font-semibold mb-2">{monthlyResult.month}</h4>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Montant calcul</span>
                                                        <span>{calcul.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Paiements effectués</span>
                                                        <span>{paiementsEffectues.toFixed(2)}</span>
                                                    </div>
                                                    <div className={`flex justify-between text-sm font-semibold mt-1 pt-1 border-t ${aPayer >= 0 ? '' : 'text-destructive'}`}>
                                                        <span>À payer / Rembourser</span>
                                                        <span>{aPayer.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">Aucun plan de calcul associé.</p>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
