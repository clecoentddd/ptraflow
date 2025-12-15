
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
import { SuspendPaiementsButton } from "@/app/mutations/suspend-paiements/components/suspend-paiements-ui";
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <span className="text-sm text-muted-foreground">Statut</span>
          <div className="flex items-center gap-3">
            <Badge variant="default" className={cn("capitalize", statusStyles[mutation.status])}>
              {mutation.status.toLowerCase().replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row">
        <SuspendPaiementsButton
          mutationId={mutation.id}
          className="flex-1 rounded-full py-6 text-sm font-semibold"
        />
        {canBeCancelled && (
          <AnnulerMutationButton
            mutationId={mutation.id}
            className="flex-1 rounded-full py-6 text-sm font-semibold"
          />
        )}
      </CardFooter>
    </Card>
  );
}
