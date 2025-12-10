
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
import { Users, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { SuspendPaiementsButton, SuspendPaiementsTodoItem } from "@/app/mutations/suspend-paiements/components/suspend-paiements-ui";
import { AnalyzeDroitsTodoItem } from "@/app/mutations/analyze-droits/components/analyze-droits-ui";
import { ValiderPlanPaiementTodoItem } from "@/app/mutations/valider-plan-paiement/components/valider-plan-paiement-ui";
import { AutoriserModificationDroitsTodoItem } from "../../autoriser-modification-des-droits/components/autoriser-modification-des-droits-ui";
import { AutoriserModificationRessourcesTodoItem } from "../../autoriser-modification-des-ressources/components/autoriser-modification-ressources-ui";
import { ValiderModificationRessourcesTodoItem } from "../../valider-modification-ressources/components/valider-modification-ressources-ui";
import { CalculerPlanTodoItem } from "../../calculer-plan/components/calculer-plan-ui";
import { PreparerDecisionTodoItem } from "../../preparer-decision/components/preparer-decision-ui";
import { ValiderDecisionTodoItem } from "../../valider-decision/components/valider-decision-ui";
import { AnnulerMutationButton } from "../../annuler-mutation/components/annuler-mutation-ui";


const statusStyles: Record<MutationStatus, string> = {
  OUVERTE: "bg-blue-500 text-white",
  EN_COURS: "bg-accent text-accent-foreground",
  COMPLETEE: "bg-primary text-primary-foreground",
  ANNULEE: "bg-destructive text-destructive-foreground",
};

const typeDetails: Record<MutationType, { title: string, icon: React.ElementType }> = {
    DROITS: { title: "Mutation de droits", icon: Users },
    RESSOURCES: { title: "Mutation de ressources", icon: Gem }
}

export function MutationCard({ mutation }: { mutation: Mutation }) {
  const details = typeDetails[mutation.type] || { title: "Mutation", icon: Users };
  const Icon = details.icon;

  const canBeCancelled = mutation.status !== 'COMPLETEE' && mutation.status !== 'ANNULEE';

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
              <PreparerDecisionTodoItem mutationId={mutation.id} />
              <ValiderDecisionTodoItem mutationId={mutation.id} />
              <ValiderPlanPaiementTodoItem mutationId={mutation.id} />
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2">
         <SuspendPaiementsButton mutationId={mutation.id} />
         {canBeCancelled && (
            <>
                <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Zone de danger</span>
                    </div>
                </div>
                <AnnulerMutationButton mutationId={mutation.id} />
            </>
         )}
      </CardFooter>
    </Card>
  );
}
