"use client";

import { CqrsProvider, useCqrs } from '@/app/mutations/mutation-lifecycle/cqrs';
import { AppHeader } from '@/app/mutations/create-mutation/components/app-header';
import { MutationCard } from '@/app/mutations/mutation-lifecycle/components/mutation-card';
import { EventStreamView } from '@/app/mutations/mutation-lifecycle/components/event-stream-view';
import { TodoListView } from '@/app/mutations/mutation-lifecycle/components/todo-list-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

function DashboardContent() {
  const { state } = useCqrs();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-1 p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 grid gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Mutations en cours</h2>
            {state.mutations.length === 0 ? (
              <Card className="flex items-center justify-center h-64 border-dashed">
                  <div className="text-center">
                      <p className="text-muted-foreground">Aucune mutation.</p>
                      <p className="text-sm text-muted-foreground">Cliquez sur "Créer une mutation" pour commencer.</p>
                  </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {state.mutations.map((mutation) => (
                    <MutationCard key={mutation.id} mutation={mutation} />
                ))}
              </div>
            )}
          </div>
          <div>
              <h2 className="text-2xl font-bold mb-4 text-foreground">Liste de tâches</h2>
              <TodoListView />
          </div>
        </div>
        <div className="lg:col-span-1">
           <Card className="h-full flex flex-col sticky top-24">
            <CardHeader>
              <CardTitle>Flux d'événements</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
                <ScrollArea className="h-[calc(100vh-16rem)]">
                    <EventStreamView />
                </ScrollArea>
            </CardContent>
          </Card>
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
