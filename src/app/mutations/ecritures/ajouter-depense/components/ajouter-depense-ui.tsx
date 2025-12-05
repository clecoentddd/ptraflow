
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
import { CalendarIcon, MinusCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MonthPicker } from '@/components/ui/month-picker';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { expenseOptions } from '../../ecriture-options';

interface AjouterDepenseUIProps {
    mutationId: string;
    ressourceVersionId: string;
}

export function AjouterDepenseUI({ mutationId, ressourceVersionId }: AjouterDepenseUIProps) {
    const { dispatchEvent } = useCqrs();
    const [isOpen, setIsOpen] = useState(false);
    
    // Form state
    const [selectedOption, setSelectedOption] = useState<{ code: string; label: string } | null>(null);
    const [montant, setMontant] = useState('');
    const [dateDebut, setDateDebut] = useState<Date | undefined>();
    const [dateFin, setDateFin] = useState<Date | undefined>();

    const handleSelectChange = (value: string) => {
        const option = expenseOptions.find(opt => opt.code === value);
        setSelectedOption(option || null);
    };

    const handleSubmit = () => {
        const parsedMontant = parseFloat(montant);
        if (isNaN(parsedMontant)) {
            toast.error("Le montant n'est pas un nombre valide.");
            return;
        }

        if (!selectedOption || !dateDebut || !dateFin) {
            toast.error("Tous les champs sont obligatoires.");
            return;
        }
        
        if (dateDebut > dateFin) {
            toast.error("La date de début ne peut pas être après la date de fin.");
            return;
        }

        dispatchEvent({
            type: 'AJOUTER_DEPENSE',
            payload: {
                mutationId,
                ressourceVersionId,
                ecritureId: crypto.randomUUID(),
                code: selectedOption.code,
                libelle: selectedOption.label,
                montant: parsedMontant,
                dateDebut: dateDebut.toISOString(),
                dateFin: dateFin.toISOString(),
            }
        });

        // Reset form and close dialog
        setSelectedOption(null);
        setMontant('');
        setDateDebut(undefined);
        setDateFin(undefined);
        setIsOpen(false);
    };
    
    const isFormValid = selectedOption && montant && dateDebut && dateFin && (dateDebut <= dateFin);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <MinusCircle className="mr-2 h-4 w-4" />
                    Ajouter une dépense
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ajouter une nouvelle dépense</DialogTitle>
                    <DialogDescription>
                        Saisissez les informations de la dépense.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="code" className="text-right">Type</Label>
                         <Select onValueChange={handleSelectChange} value={selectedOption?.code}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Sélectionnez un type de dépense" />
                            </SelectTrigger>
                            <SelectContent>
                                {expenseOptions.map(option => (
                                    <SelectItem key={option.code} value={option.code}>
                                        {option.label} ({option.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="montant" className="text-right">Montant</Label>
                        <Input id="montant" type="number" value={montant} onChange={e => setMontant(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date-debut" className="text-right">Date de début</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("col-span-3 justify-start text-left font-normal", !dateDebut && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateDebut ? format(dateDebut, 'LLLL yyyy', { locale: fr }) : <span>Choisissez un mois</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                 <MonthPicker
                                    date={dateDebut}
                                    onChange={(newDate) => setDateDebut(newDate)}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date-fin" className="text-right">Date de fin</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("col-span-3 justify-start text-left font-normal", !dateFin && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateFin ? format(dateFin, 'LLLL yyyy', { locale: fr }) : <span>Choisissez un mois</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <MonthPicker
                                    date={dateFin}
                                    onChange={(newDate) => setDateFin(newDate)}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => setIsOpen(false)} variant="ghost">Annuler</Button>
                    <Button onClick={handleSubmit} disabled={!isFormValid}>Ajouter</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
