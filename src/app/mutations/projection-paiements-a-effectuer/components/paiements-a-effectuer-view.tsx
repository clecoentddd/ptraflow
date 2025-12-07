
"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { queryPaiementsAEffectuer } from "../projection";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parse, isBefore, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";

export function PaiementsAEffectuerView() {
    const { state, dispatchEvent } = useCqrs();
    const paiements = queryPaiementsAEffectuer(state);
    const currentMonth = new Date();

    if (paiements.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">Aucune transaction à effectuer.</p>
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
        <Card>
            <CardContent className="p-0">
                {/* Desktop View: Table */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-mono w-1/4">Mois</TableHead>
                                <TableHead className="text-right w-1/4">Montant</TableHead>
                                <TableHead className="w-1/4">Transaction ID</TableHead>
                                <TableHead className="text-center w-1/4">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paiements.map((paiement) => {
                                const transactionMonth = parse(paiement.mois, 'MM-yyyy', new Date());
                                const isFuture = !isBefore(transactionMonth, endOfMonth(currentMonth));
                                
                                return (
                                    <TableRow key={paiement.transactionId}>
                                        <TableCell className="font-mono">{paiement.mois}</TableCell>
                                        <TableCell className={`text-right font-semibold ${paiement.montant >= 0 ? '' : 'text-destructive'}`}>
                                            {paiement.montant.toFixed(2)} CHF
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{paiement.transactionId}</TableCell>
                                        <TableCell className="text-center">
                                            <Button 
                                                size="sm"
                                                variant="outline"
                                                disabled={isFuture}
                                                onClick={() => handleExecuter(paiement.mutationId, paiement.transactionId, paiement.mois)}
                                                title={isFuture ? "Ne peut pas être exécuté dans le futur" : "Exécuter la transaction"}
                                            >
                                                <PlayCircle className="mr-2 h-4 w-4" />
                                                Exécuter
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                {/* Mobile View: List of Cards */}
                <div className="md:hidden space-y-3 p-4">
                    {paiements.map((paiement) => {
                        const transactionMonth = parse(paiement.mois, 'MM-yyyy', new Date());
                        const isFuture = !isBefore(transactionMonth, endOfMonth(currentMonth));
                        
                        return (
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
                            <div className="mt-4">
                                <Button 
                                    size="sm"
                                    variant="outline"
                                    disabled={isFuture}
                                    className="w-full"
                                    onClick={() => handleExecuter(paiement.mutationId, paiement.transactionId, paiement.mois)}
                                    title={isFuture ? "Ne peut pas être exécuté dans le futur" : "Exécuter la transaction"}
                                >
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                    Exécuter
                                </Button>
                            </div>
                        </div>
                    )})}
                </div>
            </CardContent>
        </Card>
    );
}
