
"use client";

import { CqrsProvider, useCqrs } from '@/app/mutations/mutation-lifecycle/cqrs';
import { AppHeader } from '@/app/mutations/create-mutation/components/app-header';
import { MutationCard } from '@/app/mutations/mutation-lifecycle/components/mutation-card';
import { EventStreamView } from '@/app/mutations/mutation-lifecycle/components/event-stream-view';
import { TodoListView } from '@/app/mutations/mutation-lifecycle/components/todo-list-view';
import { Button } from "@/components/ui/button";
import { Card } from '@/components/ui/card';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";
import { queryMutations } from '@/app/mutations/projection-mutations/projection';
import { HistoriqueMutationsView } from './historique-mutations-view';
import { LoadDemoDataButton } from './load-demo-data-button';

function DashboardContent() {
  const { state, dispatchEvent } = useCqrs();
  const allMutations = queryMutations(state);
  const activeMutations = allMutations.filter(m => m.status === 'EN_COURS' || m.status === 'OUVERTE');

  const handleCreateDroitsMutation = () => {
    dispatchEvent({ type: 'CREATE_DROITS_MUTATION' });
  };

  const handleCreateRessourcesMutation = () => {
    dispatchEvent({ type: 'CREATE_RESSOURCES_MUTATION' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-1 p-4 md:p-8 grid grid-cols-1 gap-8 items-start">
        
        <div className="grid gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Mutations Actives</h2>
            {activeMutations.length === 0 ? (
              <Card className="flex flex-col items-center justify-center h-64 border-dashed gap-4">
                  <div className="text-center">
                      <p className="text-muted-foreground mb-4">Aucune mutation active.</p>
                      <div className="flex gap-4">
                        <Button onClick={handleCreateDroitsMutation}>
                          <Plus className="mr-2 h-4 w-4" />
                          Créer mutation de droits
                        </Button>
                        <Button onClick={handleCreateRessourcesMutation} variant="secondary">
                          <Plus className="mr-2 h-4 w-4" />
                          Créer mutation de ressources
                        </Button>
                        <LoadDemoDataButton />
                      </div>
                  </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {activeMutations.map((mutation) => (
                    <MutationCard key={mutation.id} mutation={mutation} />
                ))}
              </div>
            )}
          </div>
          
           <div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Historique des Mutations</h2>
            <HistoriqueMutationsView />
          </div>

          <div>
              <h2 className="text-2xl font-bold mb-4 text-foreground">Liste de tâches</h2>
              <TodoListView />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Flux d'événements</h2>
            <ScrollArea className="h-[30rem] w-full rounded-md border">
              <EventStreamView />
            </ScrollArea>
          </div>
        </div>
      </main>
    </div>
  );
}

export function MutationsDashboard() {
  return (
    <CqrsProvider>
      <DashboardContent />
    </CqrsProvider>
  );
}
