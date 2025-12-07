
"use client";

import React, { useState } from 'react';
import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowRightCircle, CalendarIcon, Check, CheckCircle2, Circle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MonthPicker } from '@/components/ui/month-picker';
import { queryTodos } from '../../projection-todolist/projection';

export function AnalyzeDroitsTodoItem({ mutationId }: { mutationId: string }) {
    const { state } = useCqrs();
    const todos = queryTodos(state);
    const todo = todos.find(t => t.mutationId === mutationId && t.description === 'Analyser les droits');

    if (!todo) return null;

    const Icon = () => {
        switch (todo.status) {
            case 'fait': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
            case 'à faire': return <ArrowRightCircle className="h-5 w-5 text-primary animate-pulse" />;
            default: return <Circle className="h-5 w-5" />;
        }
    }

    return (
        <li className={cn("flex items-center gap-3 text-sm transition-colors",
            todo.status === 'fait' ? "text-foreground" : "text-muted-foreground",
            todo.status === 'à faire' && "font-semibold text-primary"
        )}>
            <Icon />
            <span>{todo.description}</span>
        </li>
    )
}

export function AnalyzeDroitsButton({ mutationId }: { mutationId: string }) {
    const { state, dispatchEvent } = useCqrs();
    const [isOpen, setIsOpen] = useState(false);
    const [dateDebut, setDateDebut] = useState<Date | undefined>();
    const [dateFin, setDateFin] = useState<Date | undefined>();

    const [isDebutPopoverOpen, setIsDebutPopoverOpen] = useState(false);
    const [isFinPopoverOpen, setIsFinPopoverOpen] = useState(false);

    const todos = queryTodos(state);
    const todo = todos.find(t => t.mutationId === mutationId && t.description === 'Analyser les droits');
    
    const handleSubmit = () => {
        if (!dateDebut || !dateFin) return;
        // This is a client-side check for better UX, the real business rule is in the handler
        if (dateDebut > dateFin) return; 
        dispatchEvent({
            type: 'ANALYZE_DROITS',
            payload: { mutationId, dateDebut: dateDebut.toISOString(), dateFin: dateFin.toISOString() }
        });
        setIsOpen(false);
    };

    const isTodo = todo?.status === 'à faire';
    const isDone = todo?.status === 'fait';
    
    // Client-side validation to disable the button
    const isDateRangeValid = dateDebut && dateFin && dateDebut <= dateFin;

    const getVariant = () => {
        if (isTodo) return 'default';
        if (isDone) return 'secondary';
        return 'outline';
    }

    return (
        <>
            <Button 
                onClick={() => setIsOpen(true)} 
                disabled={!isTodo}
                variant={getVariant()}
                className="w-full"
            >
                {isDone ? <Check className="mr-2 h-4 w-4" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Analyser les droits
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Analyser les droits</DialogTitle>
                        <DialogDescription>
                           Veuillez sélectionner le mois de début et le mois de fin de droits.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="date-debut" className="text-right">Date de début</label>
                            <Popover open={isDebutPopoverOpen} onOpenChange={setIsDebutPopoverOpen}>
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
                                        onChange={(newDate) => {
                                            setDateDebut(newDate);
                                            setIsDebutPopoverOpen(false);
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="date-fin" className="text-right">Date de fin</label>
                            <Popover open={isFinPopoverOpen} onOpenChange={setIsFinPopoverOpen}>
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
                                        onChange={(newDate) => {
                                            setDateFin(newDate);
                                            setIsFinPopoverOpen(false);
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsOpen(false)} variant="ghost">Annuler</Button>
                        <Button onClick={handleSubmit} disabled={!isDateRangeValid}>Analyser</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
