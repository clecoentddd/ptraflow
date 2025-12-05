
"use client";

import React, { useState, useEffect } from 'react';
import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MonthPicker } from '@/components/ui/month-picker';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { incomeOptions, expenseOptions } from '../../ecriture-options';
import type { Ecriture, EcritureType } from '@/app/mutations/mutation-lifecycle/domain';

interface MettreAJourEcritureUIProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    ecriture: Ecriture;
    mutationId: string;
    ressourceVersionId: string;
}

export function MettreAJourEcritureUI({ isOpen, setIsOpen, ecriture, mutationId, ressourceVersionId }: MettreAJourEcritureUIProps) {
    const { dispatchEvent } = useCqrs();
    
    // Form state
    const allOptions = [...incomeOptions, ...expenseOptions];
    const [ecritureType, setEcritureType] = useState<EcritureType>(ecriture.type);
    const [selectedOption, setSelectedOption] = useState<{ code: string; label: string } | null>(
        allOptions.find(opt => opt.code === ecriture.code) || null
    );
    const [montant, setMontant] = useState(ecriture.montant.toString());
    const [dateDebut, setDateDebut] = useState<Date | undefined>(parse(ecriture.dateDebut, 'MM-yyyy', new Date()));
    const [dateFin, setDateFin] = useState<Date | undefined>(parse(ecriture.dateFin, 'MM-yyyy', new Date()));

    // Reset form state when dialog opens with a new ecriture
    useEffect(() => {
        if (isOpen) {
            const currentOption = allOptions.find(opt => opt.code === ecriture.code) || null;
            setEcritureType(ecriture.type);
            setSelectedOption(currentOption);
            setMontant(ecriture.montant.toString());
            setDateDebut(parse(ecriture.dateDebut, 'MM-yyyy', new Date()));
            setDateFin(parse(ecriture.dateFin, 'MM-yyyy', new Date()));
        }
    }, [isOpen, ecriture]);

    const handleSelectChange = (value: string) => {
        const option = allOptions.find(opt => opt.code === value);
        setSelectedOption(option || null);
        if (option) {
            setEcritureType(option.code.startsWith('1') ? 'revenu' : 'dépense');
        }
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
            type: 'METTRE_A_JOUR_ECRITURE',
            payload: {
                mutationId,
                ressourceVersionId,
                originalEcritureId: ecriture.id,
                newEcritureId: crypto.randomUUID(),
                ecritureType,
                code: selectedOption.code,
                libelle: selectedOption.label,
                montant: parsedMontant,
                dateDebut: dateDebut.toISOString(),
                dateFin: dateFin.toISOString(),
            }
        });
        setIsOpen(false);
    };
    
    const isFormValid = selectedOption && montant && dateDebut && dateFin && (dateDebut <= dateFin);

    const currentOptions = ecritureType === 'revenu' ? incomeOptions : expenseOptions;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mettre à jour l'écriture</DialogTitle>
                    <DialogDescription>
                        Modifiez les informations de l'écriture.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type-ecriture" className="text-right">Catégorie</Label>
                        <Select value={ecritureType} onValueChange={(v) => {
                            setEcritureType(v as EcritureType);
                            setSelectedOption(null); // Reset selection when changing category
                        }}>
                             <SelectTrigger className="col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="revenu">Revenu</SelectItem>
                                <SelectItem value="dépense">Dépense</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="code" className="text-right">Type</Label>
                         <Select onValueChange={handleSelectChange} value={selectedOption?.code}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Sélectionnez un type" />
                            </SelectTrigger>
                            <SelectContent>
                                {currentOptions.map(option => (
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
                    <Button onClick={handleSubmit} disabled={!isFormValid}>Mettre à jour</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
