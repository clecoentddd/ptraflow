"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Mutation, MutationStatus } from "@/lib/cqrs.tsx";
import { useCqrs, DROITS_MUTATION_WORKFLOW } from "@/lib/cqrs.tsx";
import { Users, ArrowRight, CheckCircle2, Circle, ArrowRightCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyles: Record<MutationStatus, string> = {
  OUVERTE: "bg-blue-500 text-white",
  EN_COURS: "bg-accent text-accent-foreground",
  COMPLETEE: "bg-primary text-primary-foreground",
  REJETEE: "bg-destructive text-destructive-foreground",
};

export function MutationCard({ mutation }: { mutation: Mutation }) {
  const { dispatch } = useCqrs();

  const handleAdvance = () => {
    dispatch({ type: 'ADVANCE_MUTATION_STEP', payload: { mutationId: mutation.id } });
  };

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
          <p className="text-sm font-medium">Progression:</p>
          <ul className="space-y-2.5">
            {DROITS_MUTATION_WORKFLOW.steps.map((step, index) => {
              const isWorkflowCompleted = mutation.status === 'COMPLETEE';
              const isCurrent = index === mutation.currentStep && !isCompleted;
              const isDone = index < mutation.currentStep || isWorkflowCompleted;

              return (
                <li key={step} className={cn("flex items-center gap-3 text-sm transition-colors",
                  isDone ? "text-foreground" : "text-muted-foreground",
                  isCurrent && "font-semibold text-primary"
                )}>
                  {isDone ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : isCurrent ? <ArrowRightCircle className="h-5 w-5 text-primary animate-pulse" /> : <Circle className="h-5 w-5" />}
                  <span>{step}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleAdvance} disabled={isCompleted} className="w-full">
          Avancer l'étape
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
