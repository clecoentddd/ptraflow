
"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { queryDecisionHistory } from "../projection";
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
import { Badge } from "@/components/ui/badge";
import { fr } from "date-fns/locale";

export function DecisionHistoryView() {
    const { state } = useCqrs();
    const history = queryDecisionHistory(state);

    if (history.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">Aucune décision n'a encore été validée.</p>
            </Card>
        );
    }
    
    return (
        <Accordion type="multiple" className="w-full space-y-4">
            {history.map((decision) => (
                <AccordionItem value={decision.id} key={decision.id} className="border bg-card rounded-md">
                    <AccordionTrigger className="px-6 py-4 text-sm font-medium hover:no-underline">
                         <div className="flex flex-col items-start text-left w-full">
                             <div className="flex justify-between w-full items-center">
                                <CardTitle className="text-lg">Décision Validée</CardTitle>
                                <Badge variant={decision.payload.mutationType === 'DROITS' ? 'default' : 'secondary'}>
                                    {decision.payload.mutationType}
                                </Badge>
                             </div>
                             <div className="flex justify-between w-full">
                                <CardDescription className="font-mono text-xs mt-1">
                                    Decision ID: {decision.payload.decisionId}
                                </CardDescription>
                                <span className="text-xs text-muted-foreground font-mono">
                                    {format(new Date(decision.timestamp), "dd MMM yyyy, HH:mm", { locale: fr })}
                                </span>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
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
                                {decision.payload.detailCalcul.map((monthlyResult) => {
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
                   </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}

