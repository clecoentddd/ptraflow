
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
import type { Mutation, MutationStatus, MutationType, AppEvent } from "@/app/mutations/mutation-lifecycle/domain";
import { Users, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { SuspendPaiementsButton, SuspendPaiementsTodoItem } from "@/app/mutations/suspend-paiements/components/suspend-paiements-ui";
import { AnalyzeDroitsButton, AnalyzeDroitsTodoItem } from "@/app/mutations/analyze-droits/components/analyze-droits-ui";
import { ValidateMutationButton, ValidateMutationTodoItem } from "@/app/mutations/validate-mutation/components/validate-mutation-ui";
import { AutoriserModificationDroitsButton, AutoriserModificationDroitsTodoItem } from "../../autoriser-modification-des-droits/components/autoriser-modification-des-droits-ui";
import { AutoriserModificationRessourcesButton, AutoriserModificationRessourcesTodoItem } from "../../autoriser-modification-des-ressources/components/autoriser-modification-ressources-ui";
import { ValiderModificationRessourcesButton, ValiderModificationRessourcesTodoItem } from "../../valider-modification-ressources/components/valider-modification-ressources-ui";
import { AjouterRevenuUI } from "../../ecritures/ajouter-revenu/components/ajouter-revenu-ui";
import { useCqrs } from "../cqrs";
import type { ModificationRessourcesAutoriseeEvent } from "../../autoriser-modification-des-ressources/event";
import { Separator } from "@/components/ui/separator";


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

export function MutationCard({ mutation }: { mutation: Mutation }) {
  const { state } = useCqrs();
  const isCompleted = mutation.status === 'COMPLETEE' || mutation.status === 'REJETEE';
  const details = typeDetails[mutation.type] || { title: "Mutation", icon: Users };
  const Icon = details.icon;

  // Business Rule: Check if resource modification is allowed
  const authEvent = state.eventStream.find(
      (e): e is ModificationRessourcesAutoriseeEvent => 
          e.mutationId === mutation.id && e.type === 'MODIFICATION_RESSOURCES_AUTORISEE'
  );

  const isRessourceModificationValidated = state.eventStream.some(
      e => e.mutationId === mutation.id && 
           e.type === 'MODIFICATION_RESSOURCES_VALIDEE' &&
           authEvent &&
           (e as any).ressourceVersionId === authEvent.ressourceVersionId
  );

  const canEditRessources = authEvent && !isRessourceModificationValidated;

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
              <ValidateMutationTodoItem mutationId={mutation.id} />
          </ul>
        </div>
        {canEditRessources && (
            <div className="mt-6">
                <Separator className="my-4" />
                <h3 className="text-sm font-medium mb-2">Gestion des ressources</h3>
                 <p className="text-xs text-muted-foreground mb-4">Version des ressources: <code className="font-mono">{authEvent.ressourceVersionId}</code></p>
                <AjouterRevenuUI 
                    mutationId={mutation.id}
                    ressourceVersionId={authEvent.ressourceVersionId}
                />
            </div>
        )}
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
         <ValidateMutationButton mutationId={mutation.id} />
      </CardFooter>
    </Card>
  );
}
