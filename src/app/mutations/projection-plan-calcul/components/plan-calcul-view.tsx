
"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { queryPlansDeCalcul } from "../projection";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function PlanCalculView() {
    const { state } = useCqrs();
    const plans = queryPlansDeCalcul(state);

    if (plans.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">Aucun plan de calcul n'a été effectué.</p>
            </Card>
        );
    }

    return (
        <Accordion type="single" collapsible className="w-full space-y-4">
            {plans.map((plan) => (
                <AccordionItem value={plan.calculId} key={plan.calculId} className="border bg-card rounded-md">
                    <AccordionTrigger className="px-6 py-4 text-sm font-medium hover:no-underline">
                         <div className="flex flex-col items-start text-left">
                            <span className="font-semibold">Plan de Calcul ID: {plan.calculId}</span>
                            <span className="text-xs text-muted-foreground">
                                Lié à la mutation: {plan.mutationId}
                            </span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                        {/* Desktop View: Table */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="font-mono">Mois</TableHead>
                                        <TableHead className="text-right">Revenus</TableHead>
                                        <TableHead className="text-right">Dépenses</TableHead>
                                        <TableHead className="text-right">Résultat</TableHead>
                                        <TableHead className="text-right font-semibold">Calcul (10%)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {plan.detail.map((monthlyResult) => (
                                        <TableRow key={monthlyResult.month}>
                                            <TableCell className="font-mono">{monthlyResult.month}</TableCell>
                                            <TableCell className="text-right text-green-600">{monthlyResult.revenus.toFixed(2)} CHF</TableCell>
                                            <TableCell className="text-right text-blue-600">{monthlyResult.depenses.toFixed(2)} CHF</TableCell>
                                            <TableCell className="text-right">{monthlyResult.resultat.toFixed(2)} CHF</TableCell>
                                            <TableCell className="text-right font-semibold">{monthlyResult.calcul.toFixed(2)} CHF</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {/* Mobile View: List of Cards */}
                        <div className="md:hidden space-y-3">
                            {plan.detail.map((monthlyResult) => (
                                <div key={monthlyResult.month} className="p-3 rounded-lg border bg-muted/50">
                                    <h4 className="font-mono font-semibold mb-2">{monthlyResult.month}</h4>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Revenus</span>
                                        <span className="text-green-600">{monthlyResult.revenus.toFixed(2)} CHF</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Dépenses</span>
                                        <span className="text-blue-600">{monthlyResult.depenses.toFixed(2)} CHF</span>
                                    </div>
                                     <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Résultat</span>
                                        <span>{monthlyResult.resultat.toFixed(2)} CHF</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-semibold mt-1 pt-1 border-t">
                                        <span>Calcul (10%)</span>
                                        <span>{monthlyResult.calcul.toFixed(2)} CHF</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                   </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
