
"use client";

import React from 'react';
import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { queryTransactions, type Transaction, type TransactionStatut } from "../projection";
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
import { PlayCircle, CheckCircle, RotateCcw, Ban } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusDisplay: Record<TransactionStatut, { icon: React.ElementType, label: string, color: string }> = {
    'A Exécuter': { icon: PlayCircle, label: 'À Exécuter', color: 'bg-yellow-500' },
    'Exécuté': { icon: CheckCircle, label: 'Exécuté', color: 'bg-green-500' },
    'Remplacé': { icon: Ban, label: 'Remplacé', color: 'bg-gray-500' },
};

export function TransactionsView() {
    const { state, dispatchEvent } = useCqrs();
    const transactions = queryTransactions(state);
    const currentMonth = new Date();

    if (transactions.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">Aucune transaction.</p>
            </Card>
        );
    }

    const handleExecuter = (transaction: Transaction) => {
        dispatchEvent({
            type: 'EXECUTER_TRANSACTION',
            payload: { mutationId: transaction.mutationId, transactionId: transaction.id, mois: transaction.mois }
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
                                <TableHead className="font-mono w-1/5">Mois</TableHead>
                                <TableHead className="text-right w-1/5">Montant</TableHead>
                                <TableHead className="w-1/5">Statut</TableHead>
                                <TableHead className="w-1/5">Transaction ID</TableHead>
                                <TableHead className="text-center w-1/5">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((transaction) => {
                                const transactionMonth = parse(transaction.mois, 'MM-yyyy', new Date());
                                const isFuture = !isBefore(transactionMonth, endOfMonth(currentMonth));
                                const canExecute = transaction.statut === 'A Exécuter' && !isFuture;
                                const displayInfo = statusDisplay[transaction.statut];
                                
                                return (
                                    <TableRow key={transaction.id} className={transaction.statut === 'Remplacé' ? 'text-muted-foreground' : ''}>
                                        <TableCell className="font-mono">{transaction.mois}</TableCell>
                                        <TableCell className={`text-right font-semibold ${transaction.montant >= 0 ? '' : 'text-destructive'}`}>
                                            {transaction.montant.toFixed(2)} CHF
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn("border-transparent text-white", displayInfo.color)}>
                                                <displayInfo.icon className="mr-2 h-3 w-3" />
                                                {displayInfo.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{transaction.id}</TableCell>
                                        <TableCell className="text-center">
                                            {transaction.statut === 'A Exécuter' && (
                                                <Button 
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={!canExecute}
                                                    onClick={() => handleExecuter(transaction)}
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
                 <div className="md:hidden space-y-3 p-4">
                    {transactions.map((transaction) => {
                         const transactionMonth = parse(transaction.mois, 'MM-yyyy', new Date());
                         const isFuture = !isBefore(transactionMonth, endOfMonth(currentMonth));
                         const canExecute = transaction.statut === 'A Exécuter' && !isFuture;
                         const displayInfo = statusDisplay[transaction.statut];

                        return (
                        <div key={transaction.id} className={`p-3 rounded-lg border ${transaction.statut === 'Remplacé' ? 'bg-muted/30 text-muted-foreground' : 'bg-muted/50'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-mono font-semibold">{transaction.mois}</h4>
                                 <Badge variant="outline" className={cn("border-transparent text-white", displayInfo.color)}>
                                    <displayInfo.icon className="mr-2 h-3 w-3" />
                                    {displayInfo.label}
                                </Badge>
                            </div>
                            <div className={`flex justify-between text-sm font-semibold ${transaction.montant >= 0 ? '' : 'text-destructive'}`}>
                                <span>Montant</span>
                                <span>{transaction.montant.toFixed(2)} CHF</span>
                            </div>
                            <div className="flex justify-between text-xs mt-2 pt-2 border-t">
                                <span>Transaction ID</span>
                                <span className="font-mono">{transaction.id.substring(0,8)}...</span>
                            </div>
                             {transaction.statut === 'A Exécuter' && (
                                <div className="mt-4">
                                    <Button 
                                        size="sm"
                                        variant="outline"
                                        disabled={!canExecute}
                                        className="w-full"
                                        onClick={() => handleExecuter(transaction)}
                                        title={isFuture ? "Ne peut pas être exécuté dans le futur" : "Exécuter la transaction"}
                                    >
                                        <PlayCircle className="mr-2 h-4 w-4" />
                                        Exécuter
                                    </Button>
                                </div>
                             )}
                        </div>
                    )})}
                </div>
            </CardContent>
        </Card>
    );
}
