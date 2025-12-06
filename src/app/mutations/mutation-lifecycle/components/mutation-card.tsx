
"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Mutation, MutationStatus, MutationType } from "@/app/mutations/mutation-lifecycle/domain";
import { Users, Gem, CheckSquare, CheckCircle2, ArrowRightCircle, Circle, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { queryTodos } from "../../projection-todolist/projection";
import { SuspendPaiementsButton, SuspendPaiementsTodoItem } from "@/app/mutations/suspend-paiements/components/suspend-paiements-ui";
import { AnalyzeDroitsButton, AnalyzeDroitsTodoItem } from "@/app/mutations/analyze-droits/components/analyze-droits-ui";
import { ValidateMutationButton, ValidateMutationTodoItem } from "@/app/mutations/validate-mutation/components/validate-mutation-ui";
import { AutoriserModificationDroitsButton, AutoriserModificationDroitsTodoItem } from "../../autoriser-modification-des-droits/components/autoriser-modification-des-droits-ui";
import { AutoriserModificationRessourcesButton, AutoriserModificationRessourcesTodoItem } from "../../autoriser-modification-des-ressources/components/autoriser-modification-ressources-ui";
import { ValiderModificationRessourcesButton, ValiderModificationRessourcesTodoItem } from "../../valider-modification-ressources/components/valider-modification-ressources-ui";
import { CalculerPlanButton, CalculerPlanTodoItem } from "../../calculer-plan/components/calculer-plan-ui";
import { ValiderDecisionButton, ValiderDecisionTodoItem } from "../../valider-decision/components/valider-decision-ui";
import { Button } from "@/components/ui/button";


const statusStyles: Record<MutationStatus, string> = {
  OUVERTE: "bg-blue-500 text-white",
  EN_COURS: "bg-accent text-accent-foreground",
  COMPLETEE: "bg-primary text-primary-foreground",
  REJETEE: "bg-destructive text-destructive-foreground",
};

const typeDetails: Record<MutationType, { title: string, icon: React.ElementType }> = {
    DROITS: { title: "Mutation de droits", icon: Users },
    RESSOURCES: { title: "Mutation de ressources", icon: Gem }
}

const PrendreDecisionTodoItem = ({ mutationId }: { mutationId: string }) => {
    const { state } = useCqrs();
    const todos = queryTodos(state);
    const todo = todos.find(t => t.mutationId === mutationId && t.description === 'Prendre la décision');

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
    );
};

const PrendreDecisionButton = ({ mutationId }: { mutationId: string }) => {
     const { state, dispatchEvent } = useCqrs();
    const todos = queryTodos(state);
    const todo = todos.find(t => t.mutationId === mutationId && t.description === 'Prendre la décision');

     const handleClick = () => {
        // This button now triggers the VALIDATE_MUTATION command which serves as 'making the decision' in a simplified workflow.
        // For the full workflow, this would trigger a DECISION_PRISE event.
        dispatchEvent({ type: 'VALIDATE_MUTATION', payload: { mutationId } });
    };

    const isTodo = todo?.status === 'à faire';
    const isDone = todo?.status === 'fait';

    const getVariant = () => {
        if (isTodo) return 'default';
        if (isDone) return 'secondary';
        return 'outline';
    }

    // Simplified logic: The 'Prendre la décision' step is now implicitly completed by 'Valider la mutation'.
    // The button remains to represent the conceptual step.
    if (isDone) return null;


    return (
         <Button 
            onClick={handleClick} 
            disabled={!isTodo}
            variant={getVariant()}
            className="w-full"
        >
            {isDone ? <Check className="mr-2 h-4 w-4" /> : <CheckSquare className="mr-2 h-4 w-4" />}
            Prendre la décision (simplifié)
        </Button>
    )
}

export function MutationCard({ mutation }: { mutation: Mutation }) {
  const details = typeDetails[mutation.type] || { title: "Mutation", icon: Users };
  const Icon = details.icon;

  return (
    <Card className="flex flex-col justify-between transition-shadow duration-300 hover:shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="flex items-center gap-2 mb-1">
                    <Icon className="text-muted-foreground" />
                    <span>{details.title}</span>
                </CardTitle>
                <CardDescription className="font-mono text-xs">{mutation.id}</CardDescription>
            </div>
            <Badge variant="default" className={cn("capitalize", statusStyles[mutation.status])}>
                {mutation.status.toLowerCase().replace('_', ' ')}
            </Badge>
        </div>
      </CardHeader>
      <CardContent>
         <div className="space-y-3">
          <p className="text-sm font-medium">Étapes:</p>
          <ul className="space-y-2.5">
              <SuspendPaiementsTodoItem mutationId={mutation.id} />
              {mutation.type === 'DROITS' && (
                <>
                    <AutoriserModificationDroitsTodoItem mutationId={mutation.id} />
                    <AnalyzeDroitsTodoItem mutationId={mutation.id} />
                </>
              )}
              <AutoriserModificationRessourcesTodoItem mutationId={mutation.id} />
              <ValiderModificationRessourcesTodoItem mutationId={mutation.id} />
              <CalculerPlanTodoItem mutationId={mutation.id} />
              <PrendreDecisionTodoItem mutationId={mutation.id} />
              <ValiderDecisionTodoItem mutationId={mutation.id} />
              <ValidateMutationTodoItem mutationId={mutation.id} />
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2">
         <SuspendPaiementsButton mutationId={mutation.id} />
         {mutation.type === 'DROITS' && (
            <>
                <AutoriserModificationDroitsButton mutationId={mutation.id} />
                <AnalyzeDroitsButton mutationId={mutation.id} />
            </>
         )}
         <AutoriserModificationRessourcesButton mutationId={mutation.id} />
         <ValiderModificationRessourcesButton mutationId={mutation.id} />
         <CalculerPlanButton mutationId={mutation.id} />
         {/* <PrendreDecisionButton mutationId={mutation.id} /> */}
         <ValiderDecisionButton mutationId={mutation.id} />
         <ValidateMutationButton mutationId={mutation.id} />
      </CardFooter>
    </Card>
  );
}
