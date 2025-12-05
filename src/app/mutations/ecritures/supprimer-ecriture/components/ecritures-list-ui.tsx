
"use client";

import React from 'react';
import { useCqrs } from '@/app/mutations/mutation-lifecycle/cqrs';
import { queryEcritures } from '@/app/mutations/projection-ecritures/projection';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EcrituresListUIProps {
    mutationId: string;
    ressourceVersionId: string;
    canDelete: boolean;
}

export function EcrituresListUI({ mutationId, ressourceVersionId, canDelete }: EcrituresListUIProps) {
    const { state, dispatch } = useCqrs();
    const ecritures = queryEcritures(state, ressourceVersionId);

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
            <h4 className="text-xs font-semibold mb-2">Écritures saisies</h4>
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
