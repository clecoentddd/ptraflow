
"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { queryPlanDePaiement } from "../projection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/accordion";
import { format } from "date-fns";

export function PlanDePaiementView() {
    const { state } = useCqrs();
    const plans = queryPlanDePaiement(state);

    if (plans.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">Aucun plan de paiement n'a été validé.</p>
            </Card>
        );
    }

    return (
        <Accordion type="multiple" className="w-full space-y-4">
            {plans.map((plan) => (
                <AccordionItem value={plan.id} key={plan.id} className="border bg-card rounded-md">
                    <AccordionTrigger className="px-6 py-4 text-sm font-medium hover:no-underline">
                         <div className="flex flex-col items-start text-left w-full">
                             <div className="flex justify-between w-full">
                                <CardTitle className="text-lg">Plan de Paiement</CardTitle>
                                <span className="text-xs text-muted-foreground font-mono">
                                    Validé le: {format(new Date(plan.timestamp), "dd/MM/yyyy HH:mm")}
                                </span>
                             </div>
                            <CardDescription className="font-mono text-xs mt-1">
                                Plan ID: {plan.id}
                            </CardDescription>
                            <CardDescription className="font-mono text-xs mt-1">
                                Mutation ID: {plan.mutationId}
                            </CardDescription>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                        {/* Desktop View: Table */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="font-mono w-1/3">Mois</TableHead>
                                        <TableHead className="text-right w-1/3">Montant du paiement</TableHead>
                                        <TableHead className="w-1/3">Transaction ID</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {plan.paiements.sort((a,b) => a.mois.localeCompare(b.mois)).map((paiement) => (
                                        <TableRow key={paiement.transactionId}>
                                            <TableCell className="font-mono">{paiement.mois}</TableCell>
                                            <TableCell className={`text-right font-semibold ${paiement.montant >= 0 ? '' : 'text-destructive'}`}>
                                                {paiement.montant.toFixed(2)} CHF
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{paiement.transactionId}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {/* Mobile View: List of Cards */}
                        <div className="md:hidden space-y-3">
                            {plan.paiements.sort((a,b) => a.mois.localeCompare(b.mois)).map((paiement) => (
                                <div key={paiement.transactionId} className="p-3 rounded-lg border bg-muted/50">
                                    <h4 className="font-mono font-semibold mb-2">{paiement.mois}</h4>
                                    <div className={`flex justify-between text-sm font-semibold ${paiement.montant >= 0 ? '' : 'text-destructive'}`}>
                                        <span>Montant</span>
                                        <span>{paiement.montant.toFixed(2)} CHF</span>
                                    </div>
                                    <div className="flex justify-between text-xs mt-2 pt-2 border-t text-muted-foreground">
                                        <span>Transaction ID</span>
                                        <span className="font-mono">{paiement.transactionId.substring(0,8)}...</span>
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
