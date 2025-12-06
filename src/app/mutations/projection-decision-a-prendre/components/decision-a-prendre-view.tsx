
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
import { queryTodos } from "../../projection-todolist/projection";

export function DecisionAPrendreView() {
    const { state } = useCqrs();
    const decisions = queryDecisionsAPrendre(state);
    const todos = queryTodos(state);

    const activeDecisions = decisions.filter(d => 
        todos.some(t => t.mutationId === d.mutationId && t.description === 'Prendre la décision' && t.status === 'à faire')
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
                                <CardTitle>Décision pour la mutation</CardTitle>
                                <CardDescription className="font-mono text-xs">{decision.mutationId}</CardDescription>
                            </div>
                            <Badge variant={decision.mutationType === 'DROITS' ? 'default' : 'secondary'}>
                                {decision.mutationType}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold mb-2">Périodes concernées</h4>
                            {decision.periodeDroits && (
                                <p className="text-sm">
                                    Période de droits : <span className="font-medium">{decision.periodeDroits.dateDebut}</span> au <span className="font-medium">{decision.periodeDroits.dateFin}</span>
                                </p>
                            )}
                            {decision.periodeModifications && (
                                <p className="text-sm">
                                    Période de modifications : <span className="font-medium">{decision.periodeModifications.dateDebut}</span> au <span className="font-medium">{decision.periodeModifications.dateFin}</span>
                                </p>
                            )}
                        </div>

                        <div>
                             <h4 className="font-semibold mb-2">Plans</h4>
                             <p className="text-sm">
                                ID Plan de Calcul : <span className="font-mono text-xs">{decision.planDeCalcul?.calculId || 'N/A'}</span>
                             </p>
                             <p className="text-sm">
                                ID Plan de Paiement : <span className="font-mono text-xs">{decision.planDePaiementId || 'N/A'}</span>
                             </p>
                        </div>

                        {decision.planDeCalcul ? (
                             <div>
                                <h4 className="font-semibold mb-2">Détail du Plan de Calcul</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-mono">Mois</TableHead>
                                            <TableHead className="text-right">Revenus</TableHead>
                                            <TableHead className="text-right">Dépenses</TableHead>
                                            <TableHead className="text-right font-semibold">Résultat</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {decision.planDeCalcul.detail.map((monthlyResult) => (
                                            <TableRow key={monthlyResult.month}>
                                                <TableCell className="font-mono">{monthlyResult.month}</TableCell>
                                                <TableCell className="text-right text-green-600">{monthlyResult.revenus.toFixed(2)}</TableCell>
                                                <TableCell className="text-right text-blue-600">{monthlyResult.depenses.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-semibold">{monthlyResult.resultat.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
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
