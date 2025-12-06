
"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { queryPlansDeCalcul } from "../projection";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
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
    
    const totalCalcul = (plan: (typeof plans)[0]) => plan.detail.reduce((acc, month) => acc + month.calcul, 0);

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
                             <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={4} className="text-right font-bold text-base">Total</TableCell>
                                    <TableCell className="text-right font-bold text-base">{totalCalcul(plan).toFixed(2)} CHF</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                   </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
