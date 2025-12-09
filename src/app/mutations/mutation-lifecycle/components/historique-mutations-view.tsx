
"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { queryMutations, type Mutation, type MutationStatus, type MutationType } from "../../projection-mutations/projection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Users, Gem, Ban, Check } from "lucide-react";

const statusStyles: Record<MutationStatus, string> = {
  OUVERTE: "bg-blue-500 text-white",
  EN_COURS: "bg-accent text-accent-foreground",
  COMPLETEE: "bg-primary text-primary-foreground",
  ANNULEE: "bg-destructive text-destructive-foreground",
};

const typeDetails: Record<MutationType, { title: string, icon: React.ElementType }> = {
    DROITS: { title: "Mutation de droits", icon: Users },
    RESSOURCES: { title: "Mutation de ressources", icon: Gem }
};

export function HistoriqueMutationsView() {
    const { state } = useCqrs();
    const allMutations = queryMutations(state);
    const historicalMutations = allMutations.filter(m => m.status === 'COMPLETEE' || m.status === 'ANNULEE');

    if (historicalMutations.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">Aucune mutation dans l'historique.</p>
            </Card>
        );
    }
    
    return (
        <Accordion type="multiple" className="w-full space-y-4">
            {historicalMutations.map((mutation) => {
                const details = typeDetails[mutation.type];
                const Icon = details.icon;
                const lastEvent = mutation.history[mutation.history.length - 1];

                return (
                    <AccordionItem value={mutation.id} key={mutation.id} className="border bg-card rounded-md">
                        <AccordionTrigger className="px-6 py-4 text-sm font-medium hover:no-underline">
                             <div className="flex flex-col items-start text-left w-full">
                                 <div className="flex justify-between w-full items-center">
                                    <div className="flex items-center gap-2">
                                         <Icon className="h-5 w-5 text-muted-foreground" />
                                         <span className="text-lg font-semibold">{details.title}</span>
                                    </div>
                                    <Badge variant="outline" className={cn("capitalize", statusStyles[mutation.status])}>
                                        {mutation.status === 'COMPLETEE' ? <Check className="mr-1 h-3 w-3" /> : <Ban className="mr-1 h-3 w-3" />}
                                        {mutation.status.toLowerCase()}
                                    </Badge>
                                 </div>
                                 <div className="flex justify-between w-full mt-1">
                                    <CardDescription className="font-mono text-xs">
                                        ID: {mutation.id}
                                    </CardDescription>
                                    {lastEvent && (
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {formatDistanceToNow(new Date(lastEvent.timestamp), { addSuffix: true, locale: fr })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-4">
                           <div className="text-sm text-muted-foreground">
                               Détail des événements de la mutation.
                           </div>
                           <pre className="mt-2 text-xs font-mono bg-muted p-2 rounded-md overflow-x-auto">
                                {JSON.stringify(mutation.history, null, 2)}
                           </pre>
                       </AccordionContent>
                    </AccordionItem>
                );
            })}
        </Accordion>
    );
}
