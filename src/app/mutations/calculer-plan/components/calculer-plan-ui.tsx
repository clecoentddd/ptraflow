
"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowRightCircle, Check, CheckCircle2, Circle } from "lucide-react";
import { queryTodos } from "../../projection-todolist/projection";
import { queryMutations } from "../../projection-mutations/projection";
import { queryJournal } from "../../projection-journal/projection";
import { calculatePlan } from "../../shared/plan-de-calcul.service";
import type { DroitsAnalysesEvent } from "../../analyze-droits/event";
import { toast } from "react-hot-toast";

export function CalculerPlanTodoItem({ mutationId }: { mutationId: string }) {
    const { state } = useCqrs();
    const todos = queryTodos(state);
    const todo = todos.find(t => t.mutationId === mutationId && t.description === 'Calculer le plan');

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

export function CalculerPlanButton({ mutationId }: { mutationId: string }) {
    const { state, dispatchEvent } = useCqrs();
    const todos = queryTodos(state);
    const todo = todos.find(t => t.mutationId === mutationId && t.description === 'Calculer le plan');
    
    const handleClick = () => {
        // --- This is the "Automaton" or "Processor" logic, executed by the UI in this case ---
        
        const mutation = queryMutations(state).find(m => m.id === mutationId);
        if (!mutation) {
            toast.error("Mutation non trouvée.");
            return;
        }

        // 1. Determine period
        let dateDebut: string | undefined;
        let dateFin: string | undefined;

        if (mutation.type === 'DROITS') {
            const droitsAnalysesEvent = mutation.history.find(e => e.type === 'DROITS_ANALYSES') as DroitsAnalysesEvent | undefined;
            if (!droitsAnalysesEvent) {
                toast.error("Période de droits non trouvée pour cette mutation.");
                return;
            }
            dateDebut = droitsAnalysesEvent.payload.dateDebut;
            dateFin = droitsAnalysesEvent.payload.dateFin;
        } else { // RESSOURCES
            const journalEntry = queryJournal(state).find(j => j.mutationId === mutationId);
            if (!journalEntry?.ressourcesDateDebut || !journalEntry?.ressourcesDateFin) {
                toast.error("Période de modification des ressources non trouvée.");
                return;
            }
            dateDebut = journalEntry.ressourcesDateDebut;
            dateFin = journalEntry.ressourcesDateFin;
        }

        if (!dateDebut || !dateFin) {
            toast.error("Impossible de déterminer la période pour le calcul.");
            return;
        }
        
        const lastRessourceVersionIdEvent = [...mutation.history].reverse().find(e => 'ressourceVersionId' in e);
        if (!lastRessourceVersionIdEvent || !('ressourceVersionId' in lastRessourceVersionIdEvent)) {
             toast.error("Impossible de trouver un ressourceVersionId pour le calcul.");
            return;
        }
        const ressourceVersionId = lastRessourceVersionIdEvent.ressourceVersionId;

        // 2. Call the pure service
        const resultatDuCalcul = calculatePlan(state.ecritures, dateDebut, dateFin);

        // 3. Dispatch the command with the result for validation
        dispatchEvent({ 
            type: 'VALIDER_PLAN_CALCUL', 
            payload: {
                mutationId,
                ressourceVersionId,
                calculId: crypto.randomUUID(),
                resultatDuCalcul
            }
        });
    };

    if (!todo) return null;

    const isTodo = todo.status === 'à faire';
    const isDone = todo.status === 'fait';

    const getVariant = () => {
        if (isTodo) return 'default';
        if (isDone) return 'secondary';
        return 'outline';
    }

    return (
         <Button 
            onClick={handleClick} 
            disabled={!isTodo}
            variant={getVariant()}
            className="w-full"
        >
            {isDone ? <Check className="mr-2 h-4 w-4" /> : <ArrowRight className="mr-2 h-4 w-4" />}
            Lancer le calcul
        </Button>
    )
}
