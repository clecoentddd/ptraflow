
"use client";

import React, { useState } from 'react';
import { useCqrs } from '@/app/mutations/mutation-lifecycle/cqrs';
import { queryEcrituresByMonth } from '@/app/mutations/projection-ecritures/projection';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MinusCircle, PlusCircle, Trash2, Edit } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ModificationRessourcesAutoriseeEvent } from '../../../autoriser-modification-des-ressources/event';
import { AjouterRevenuUI } from '../../ajouter-revenu/components/ajouter-revenu-ui';
import { AjouterDepenseUI } from '../../ajouter-depense/components/ajouter-depense-ui';
import { MettreAJourEcritureUI } from '../../mettre-a-jour-ecriture/components/mettre-a-jour-ecriture-ui';
import type { Ecriture } from '@/app/mutations/mutation-lifecycle/domain';

// This component shows ALL ecritures pivoted by month
export function AllEcrituresListView() {
    const { state, dispatchEvent } = useCqrs();
    const { months, rows } = queryEcrituresByMonth(state);

    const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
    const [ecritureToUpdate, setEcritureToUpdate] = useState<Ecriture | null>(null);

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

        dispatchEvent({
            type: 'SUPPRIMER_ECRITURE',
            payload: {
                mutationId: activeMutation.id,
                ressourceVersionId: authEventForActiveMutation.ressourceVersionId, // The "key" to delete is the current context
                ecritureId: ecriture.id,
            },
        });
    };

    const handleOpenUpdateDialog = (ecriture: Ecriture) => {
        setEcritureToUpdate(ecriture);
        setUpdateDialogOpen(true);
    };

    return (
        <>
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
                                    {canEdit && <TableHead className="w-24"></TableHead>}
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
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleOpenUpdateDialog(row.ecriture)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
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
                            </TableBody>
                        </Table>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
        {ecritureToUpdate && authEventForActiveMutation && (
            <MettreAJourEcritureUI
                isOpen={updateDialogOpen}
                setIsOpen={setUpdateDialogOpen}
                ecriture={ecritureToUpdate}
                mutationId={authEventForActiveMutation.mutationId}
                ressourceVersionId={authEventForActiveMutation.ressourceVersionId}
            />
        )}
        </>
    );
}
