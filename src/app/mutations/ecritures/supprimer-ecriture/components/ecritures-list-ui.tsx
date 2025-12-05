
"use client";

import React from 'react';
import { useCqrs } from '@/app/mutations/mutation-lifecycle/cqrs';
import { queryEcrituresForRessourceVersion, queryEcrituresByMonth } from '@/app/mutations/projection-ecritures/projection';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

interface EcrituresListUIProps {
    mutationId: string;
    ressourceVersionId: string;
    canDelete: boolean;
}

// This component shows the ecritures for a SPECIFIC mutation version
export function EcrituresForMutationListUI({ mutationId, ressourceVersionId, canDelete }: EcrituresListUIProps) {
    const { state, dispatch } = useCqrs();
    const ecritures = queryEcrituresForRessourceVersion(state, ressourceVersionId);

    const handleSupprimer = (ecritureId: string) => {
        dispatch({
            type: 'SUPPRIMER_ECRITURE',
            payload: {
                mutationId,
                ressourceVersionId,
                ecritureId,
            },
        });
    };
    
    if (ecritures.length === 0) {
        return <p className="text-xs text-muted-foreground text-center mt-4">Aucune écriture pour cette version.</p>
    }

    return (
        <div className="mt-4">
            <h4 className="text-xs font-semibold mb-2">Écritures saisies pour cette modification</h4>
            <ScrollArea className="h-48 rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Libellé</TableHead>
                            <TableHead className="text-right text-xs">Montant</TableHead>
                            {canDelete && <TableHead className="w-[50px]"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ecritures.map((ecriture) => (
                            <TableRow key={ecriture.id}>
                                <TableCell>
                                    <Badge variant={ecriture.type === 'revenu' ? 'default' : 'destructive'} className="text-xs">
                                        {ecriture.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs">{ecriture.libelle}</TableCell>
                                <TableCell className="text-right text-xs font-mono">{ecriture.montant.toFixed(2)} €</TableCell>
                                {canDelete && (
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => handleSupprimer(ecriture.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
}


// This component shows ALL ecritures pivoted by month
export function AllEcrituresListView() {
    const { state } = useCqrs();
    const { months, rows, totals } = queryEcrituresByMonth(state);

    if (rows.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">Aucune écriture enregistrée.</p>
            </Card>
        );
    }

    return (
        <Card>
            <ScrollArea className="h-96">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[200px]">Écriture</TableHead>
                            {months.map(month => (
                                <TableHead key={month} className="text-right font-mono min-w-[100px]">
                                    {month}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map(row => (
                             <TableRow key={row.ecriture.id}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{row.ecriture.libelle}</span>
                                        <span className="text-xs text-muted-foreground">{row.ecriture.code} - {row.ecriture.type}</span>
                                    </div>
                                </TableCell>
                                {months.map(month => (
                                    <TableCell key={`${row.ecriture.id}-${month}`} className="text-right font-mono">
                                        {row.monthlyAmounts[month] 
                                            ? <span className={row.ecriture.type === 'dépense' ? 'text-destructive' : ''}>{row.monthlyAmounts[month]?.toFixed(2)} €</span>
                                            : <span className="text-muted-foreground">-</span>}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                             <TableCell>Total</TableCell>
                             {months.map(month => (
                                <TableCell key={`total-${month}`} className="text-right font-mono">
                                    <span className={totals[month] < 0 ? 'text-destructive' : ''}>
                                        {totals[month].toFixed(2)} €
                                    </span>
                                </TableCell>
                             ))}
                        </TableRow>
                    </TableBody>
                </Table>
            </ScrollArea>
        </Card>
    );
}
