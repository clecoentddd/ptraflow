"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function EventStreamView() {
    const { state } = useCqrs();

    return (
        <div className="p-4">
             {state.eventStream.length === 0 ? (
                 <div className="flex items-center justify-center h-full text-center">
                    <p className="text-sm text-muted-foreground">Le flux d'événements est vide.</p>
                 </div>
            ) : (
                <Accordion type="multiple" className="w-full space-y-2">
                    {state.eventStream.map((event) => {
                        return (
                            <AccordionItem value={event.id} key={event.id} className="border bg-card rounded-md px-3">
                               <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                                    <div className="flex flex-col items-start text-left">
                                        <span className="font-semibold">{event.type}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: fr })}
                                        </span>
                                    </div>
                               </AccordionTrigger>
                               <AccordionContent>
                                    <pre className="text-xs font-mono bg-muted p-2 rounded-md overflow-x-auto">
                                        {JSON.stringify(event, null, 2)}
                                    </pre>
                               </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            )}
        </div>
    );
}
