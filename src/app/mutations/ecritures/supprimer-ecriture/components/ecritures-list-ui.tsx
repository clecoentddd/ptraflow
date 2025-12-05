
"use client";

import React from 'react';
import { useCqrs } from '@/app/mutations/mutation-lifecycle/cqrs';
import { queryEcrituresForRessourceVersion, queryEcrituresByMonth } from '@/app/mutations/projection-ecritures/projection';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MinusCircle, PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ModificationRessourcesAutoriseeEvent } from '../../../autoriser-modification-des-ressources/event';
import { AjouterRevenuUI } from '../../ajouter-revenu/components/ajouter-revenu-ui';
import { AjouterDepenseUI } from '../../ajouter-depense/components/ajouter-depense-ui';

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
        return null;
    }

    return (
        <div className="mt-4">
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
                                <TableCell className="text-right text-xs font-mono">{ecriture.montant.toFixed(2)} CHF</TableCell>
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
    const { state, dispatch } = useCqrs();
    const { months, rows, totals } = queryEcrituresByMonth(state);

    const activeMutation = state.mutations.find(m => m.status === 'EN_COURS' || m.status === 'OUVERTE');

    const authEventForActiveMutation = activeMutation 
        ? state.eventStream.find(e => e.mutationId === activeMutation.id && e.type === 'MODIFICATION_RESSOURCES_AUTORISEE') as ModificationRessourcesAutoriseeEvent | undefined
        : undefined;
    
    const canEdit = authEventForActiveMutation && !state.eventStream.some(
        e => e.mutationId === authEventForActiveMutation.mutationId && 
             e.type === 'MODIFICATION_RESSOURCES_VALIDEE' &&
             (e as any).ressourceVersionId === authEventForActiveMutation.ressourceVersionId
    );

    const handleSupprimer = (ecriture: (typeof rows)[0]['ecriture']) => {
        if (!activeMutation || !authEventForActiveMutation) return;

        dispatch({
            type: 'SUPPRIMER_ECRITURE',
            payload: {
                mutationId: activeMutation.id,
                ressourceVersionId: authEventForActiveMutation.ressourceVersionId, // The "key" to delete is the current context
                ecritureId: ecriture.id,
            },
        });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Écritures</CardTitle>
                {canEdit && authEventForActiveMutation && (
                    <div className="flex gap-2">
                        <AjouterRevenuUI 
                            mutationId={authEventForActiveMutation.mutationId}
                            ressourceVersionId={authEventForActiveMutation.ressourceVersionId}
                        />
                        <AjouterDepenseUI
                            mutationId={authEventForActiveMutation.mutationId}
                            ressourceVersionId={authEventForActiveMutation.ressourceVersionId}
                        />
                    </div>
                )}
            </CardHeader>
            <CardContent>
                {rows.length === 0 ? (
                     <div className="flex items-center justify-center h-48 border-dashed border rounded-md">
                        <p className="text-muted-foreground">Aucune écriture enregistrée.</p>
                    </div>
                ) : (
                    <ScrollArea className="w-full whitespace-nowrap">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[200px]">Écriture</TableHead>
                                    {months.map(month => (
                                        <TableHead key={month} className="text-right font-mono min-w-[100px]">
                                            {month}
                                        </TableHead>
                                    ))}
                                    {canEdit && <TableHead className="w-12"></TableHead>}
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
                                                    ? <span className={row.ecriture.type === 'dépense' ? 'text-blue-600' : 'text-green-600'}>{row.monthlyAmounts[month]?.toFixed(2)} CHF</span>
                                                    : <span className="text-muted-foreground">-</span>}
                                            </TableCell>
                                        ))}
                                        {canEdit && (
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleSupprimer(row.ecriture)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                                <TableRow className="bg-muted/50 font-bold">
                                     <TableCell>Total</TableCell>
                                     {months.map(month => (
                                        <TableCell key={`total-${month}`} className="text-right font-mono">
                                            <span className={totals[month] < 0 ? 'text-blue-600' : 'text-green-600'}>
                                                {totals[month].toFixed(2)} CHF
                                            </span>
                                        </TableCell>
                                     ))}
                                     {canEdit && <TableCell></TableCell>}
                                </TableRow>
                            </TableBody>
                        </Table>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
