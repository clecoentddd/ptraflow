
"use client";

import React, { useState } from 'react';
import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AjouterRevenuUIProps {
    mutationId: string;
    ressourceVersionId: string;
}

export function AjouterRevenuUI({ mutationId, ressourceVersionId }: AjouterRevenuUIProps) {
    const { dispatch } = useCqrs();
    const [isOpen, setIsOpen] = useState(false);
    
    // Form state
    const [code, setCode] = useState('');
    const [libelle, setLibelle] = useState('');
    const [montant, setMontant] = useState('');
    const [dateDebut, setDateDebut] = useState('');
    const [dateFin, setDateFin] = useState('');

    const handleSubmit = () => {
        const parsedMontant = parseFloat(montant);
        if (isNaN(parsedMontant)) {
            toast.error("Le montant n'est pas un nombre valide.");
            return;
        }

        if (!code || !libelle || !dateDebut || !dateFin) {
            toast.error("Tous les champs sont obligatoires.");
            return;
        }

        dispatch({
            type: 'AJOUTER_REVENU',
            payload: {
                mutationId,
                ressourceVersionId,
                ecritureId: crypto.randomUUID(),
                code,
                libelle,
                montant: parsedMontant,
                dateDebut, // expected format YYYY-MM-DD from input type="date"
                dateFin,   // expected format YYYY-MM-DD from input type="date"
            }
        });

        // Reset form and close dialog
        setCode('');
        setLibelle('');
        setMontant('');
        setDateDebut('');
        setDateFin('');
        setIsOpen(false);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ajouter un revenu
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ajouter un nouveau revenu</DialogTitle>
                    <DialogDescription>
                        Saisissez les informations du revenu. Le code doit commencer par '1'.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="code" className="text-right">Code</Label>
                        <Input id="code" value={code} onChange={e => setCode(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="libelle" className="text-right">Libellé</Label>
                        <Input id="libelle" value={libelle} onChange={e => setLibelle(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="montant" className="text-right">Montant</Label>
                        <Input id="montant" type="number" value={montant} onChange={e => setMontant(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="dateDebut" className="text-right">Date de début</Label>
                        <Input id="dateDebut" type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="dateFin" className="text-right">Date de fin</Label>
                        <Input id="dateFin" type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => setIsOpen(false)} variant="ghost">Annuler</Button>
                    <Button onClick={handleSubmit}>Ajouter</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
