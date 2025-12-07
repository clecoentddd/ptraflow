
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
                             <CardDescription className="font-mono text-xs mt-1">
                                Decision ID: {plan.decisionId}
                            </CardDescription>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                       <div className="text-sm text-muted-foreground">
                           Cet enregistrement confirme la validation du plan de paiement. Les transactions à exécuter sont gérées dans la section "Transactions".
                       </div>
                   </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
