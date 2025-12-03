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
import type { Mutation, MutationStatus } from "@/app/mutations/mutation-lifecycle/cqrs";
import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SuspendPaiementsButton, SuspendPaiementsTodoItem } from "@/app/mutations/suspend-paiements/components/suspend-paiements-ui";
import { AnalyzeDroitsButton, AnalyzeDroitsTodoItem } from "@/app/mutations/analyze-droits/components/analyze-droits-ui";


const statusStyles: Record<MutationStatus, string> = {
  OUVERTE: "bg-blue-500 text-white",
  EN_COURS: "bg-accent text-accent-foreground",
  COMPLETEE: "bg-primary text-primary-foreground",
  REJETEE: "bg-destructive text-destructive-foreground",
};

export function MutationCard({ mutation }: { mutation: Mutation }) {
  const { state } = useCqrs();
  const todos = state.todos.filter(t => t.mutationId === mutation.id);
  const isCompleted = mutation.status === 'COMPLETEE' || mutation.status === 'REJETEE';

  return (
    <Card className="flex flex-col justify-between transition-shadow duration-300 hover:shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="flex items-center gap-2 mb-1">
                    <Users className="text-muted-foreground" />
                    <span>Mutation de droits</span>
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
              <AnalyzeDroitsTodoItem mutationId={mutation.id} />
              {/* Future steps will be added here */}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2">
         <SuspendPaiementsButton mutationId={mutation.id} />
         <AnalyzeDroitsButton mutationId={mutation.id} />
      </CardFooter>
    </Card>
  );
}
