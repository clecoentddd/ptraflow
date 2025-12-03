"use client";

import { useCqrs, type AppEvent } from "@/lib/cqrs.tsx";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FilePlus, CheckCircle, AlertCircle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const eventMetadata: Record<string, { icon: React.ElementType; color: string; label: string; }> = {
    DROITS_MUTATION_CREATED: { icon: FilePlus, color: "text-blue-500", label: "Mutation créée" },
    DROITS_MUTATION_STEP_ADVANCED: { icon: CheckCircle, color: "text-green-500", label: "Étape avancée" },
    DROITS_MUTATION_COMPLETED: { icon: CheckCircle, color: "text-primary", label: "Mutation complétée" },
    DROITS_MUTATION_REJECTED: { icon: Ban, color: "text-destructive", label: "Mutation rejetée" },
};

export function EventStreamView() {
    const { state } = useCqrs();

    return (
        <div className="p-4">
             {state.eventStream.length === 0 ? (
                 <div className="flex items-center justify-center h-full text-center">
                    <p className="text-sm text-muted-foreground">Le flux d'événements est vide.</p>
                 </div>
            ) : (
                <ul className="space-y-4">
                    {state.eventStream.map((event) => {
                        const metadata = eventMetadata[event.type] || { icon: AlertCircle, color: "text-muted-foreground", label: event.type };
                        const Icon = metadata.icon;

                        return (
                            <li key={event.id} className="flex items-start gap-4 animate-in fade-in-0 slide-in-from-top-4 duration-500">
                                <TooltipProvider delayDuration={0}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="p-2 bg-card rounded-full border">
                                                <Icon className={cn("h-5 w-5", metadata.color)} />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{metadata.label}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <div className="flex-grow overflow-hidden pt-1">
                                    <p className="font-semibold text-sm text-foreground capitalize">{metadata.label}</p>
                                    <p className="text-xs text-muted-foreground font-mono truncate" title={event.mutationId}>
                                        ID: {event.mutationId}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: fr })}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
