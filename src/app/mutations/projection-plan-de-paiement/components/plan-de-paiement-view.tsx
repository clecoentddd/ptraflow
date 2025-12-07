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
import { format, parse, isBefore, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { queryTransactionsEffectuees } from "../../projection-transactions-effectuees/projection";
import { CheckCircle, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlanDePaiementView() {
    const { state, dispatchEvent } = useCqrs();
    const plans = queryPlanDePaiement(state);
    const transactionsEffectuees = queryTransactionsEffectuees(state);
    const currentMonth = new Date();

    if (plans.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">Aucun plan de paiement n'a été validé.</p>
            </Card>
        );
    }
    
    const handleExecuter = (mutationId: string, transactionId: string, mois: string) => {
        dispatchEvent({
            type: 'EXECUTER_TRANSACTION',
            payload: { mutationId, transactionId, mois }
        });
    };

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
                                        <TableHead className="font-mono w-1/4">Mois</TableHead>
                                        <TableHead className="text-right w-1/4">Montant du paiement</TableHead>
                                        <TableHead className="w-1/4">Transaction ID</TableHead>
                                        <TableHead className="text-center w-1/4">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {plan.paiements.sort((a,b) => a.mois.localeCompare(b.mois)).map((paiement) => {
                                        const isExecuted = transactionsEffectuees.includes(paiement.transactionId);
                                        const transactionMonth = parse(paiement.mois, 'MM-yyyy', new Date());
                                        const isFuture = !isBefore(transactionMonth, endOfMonth(currentMonth));
                                        
                                        return (
                                            <TableRow key={paiement.transactionId} className={cn(isExecuted && "bg-green-500/10 hover:bg-green-500/20")}>
                                                <TableCell className="font-mono">{paiement.mois}</TableCell>
                                                <TableCell className={`text-right font-semibold ${paiement.montant >= 0 ? '' : 'text-destructive'}`}>
                                                    {paiement.montant.toFixed(2)} CHF
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{paiement.transactionId}</TableCell>
                                                <TableCell className="text-center">
                                                    {isExecuted ? (
                                                        <span className="flex items-center justify-center gap-2 text-sm text-green-600 font-semibold">
                                                            <CheckCircle className="h-4 w-4"/>
                                                            Effectuée
                                                        </span>
                                                    ) : (
                                                        <Button 
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={isFuture}
                                                            onClick={() => handleExecuter(plan.mutationId, paiement.transactionId, paiement.mois)}
                                                            title={isFuture ? "Ne peut pas être exécuté dans le futur" : "Exécuter la transaction"}
                                                        >
                                                            <PlayCircle className="mr-2 h-4 w-4" />
                                                            Exécuter
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        {/* Mobile View: List of Cards */}
                        <div className="md:hidden space-y-3">
                            {plan.paiements.sort((a,b) => a.mois.localeCompare(b.mois)).map((paiement) => {
                                 const isExecuted = transactionsEffectuees.includes(paiement.transactionId);
                                 const transactionMonth = parse(paiement.mois, 'MM-yyyy', new Date());
                                 const isFuture = !isBefore(transactionMonth, endOfMonth(currentMonth));
                                
                                return (
                                <div key={paiement.transactionId} className={cn("p-3 rounded-lg border", isExecuted ? "bg-green-500/10" : "bg-muted/50")}>
                                    <h4 className="font-mono font-semibold mb-2">{paiement.mois}</h4>
                                    <div className={`flex justify-between text-sm font-semibold ${paiement.montant >= 0 ? '' : 'text-destructive'}`}>
                                        <span>Montant</span>
                                        <span>{paiement.montant.toFixed(2)} CHF</span>
                                    </div>
                                    <div className="flex justify-between text-xs mt-2 pt-2 border-t text-muted-foreground">
                                        <span>Transaction ID</span>
                                        <span className="font-mono">{paiement.transactionId.substring(0,8)}...</span>
                                    </div>
                                    <div className="mt-4">
                                         {isExecuted ? (
                                             <span className="flex items-center justify-center gap-2 text-sm text-green-600 font-semibold">
                                                <CheckCircle className="h-4 w-4"/>
                                                Effectuée
                                            </span>
                                        ) : (
                                             <Button 
                                                size="sm"
                                                variant="outline"
                                                disabled={isFuture}
                                                className="w-full"
                                                onClick={() => handleExecuter(plan.mutationId, paiement.transactionId, paiement.mois)}
                                                title={isFuture ? "Ne peut pas être exécuté dans le futur" : "Exécuter la transaction"}
                                            >
                                                <PlayCircle className="mr-2 h-4 w-4" />
                                                Exécuter
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )})}
                        </div>
                   </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
