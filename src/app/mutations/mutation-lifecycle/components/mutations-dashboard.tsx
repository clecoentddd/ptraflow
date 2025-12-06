
"use client";

import { CqrsProvider, useCqrs } from '@/app/mutations/mutation-lifecycle/cqrs';
import { AppHeader } from '@/app/mutations/create-mutation/components/app-header';
import { MutationCard } from '@/app/mutations/mutation-lifecycle/components/mutation-card';
import { EventStreamView } from '@/app/mutations/mutation-lifecycle/components/event-stream-view';
import { TodoListView } from '@/app/mutations/mutation-lifecycle/components/todo-list-view';
import { Card } from '@/components/ui/card';
import { ScrollArea }from "@/components/ui/scroll-area";
import { ValidatedPeriodsView } from './validated-periods-view';
import { queryMutations } from '../../projection-mutations/projection';
import { AllEcrituresListView } from '../../ecritures/supprimer-ecriture/components/ecritures-list-ui';
import { JournalView } from '../../projection-journal/components/journal-ui';
import { PlanCalculView } from '../../projection-plan-calcul/components/plan-calcul-view';
import { DecisionAPrendreView } from '../../projection-decision-a-prendre/components/decision-a-prendre-view';
import { PlanDePaiementView } from '../../projection-plan-de-paiement/components/plan-de-paiement-view';

function DashboardContent() {
  const { state } = useCqrs();
  const mutations = queryMutations(state);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-1 p-4 md:p-8 grid grid-cols-1 gap-8 items-start">
        
        <div className="grid gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Mutations</h2>
            {mutations.length === 0 ? (
              <Card className="flex items-center justify-center h-64 border-dashed">
                  <div className="text-center">
                      <p className="text-muted-foreground">Aucune mutation.</p>
                      <p className="text-sm text-muted-foreground">Cliquez sur "Créer une mutation" pour commencer.</p>
                  </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {mutations.map((mutation) => (
                    <MutationCard key={mutation.id} mutation={mutation} />
                ))}
              </div>
            )}
          </div>

          <div>
              <h2 className="text-2xl font-bold mb-4 text-foreground">Journal des modifications</h2>
              <JournalView />
          </div>

           <div>
              <h2 className="text-2xl font-bold mb-4 text-foreground">Périodes de droits validées</h2>
              <ValidatedPeriodsView />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Écritures</h2>
            <AllEcrituresListView />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Plan de calcul</h2>
            <PlanCalculView />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Décision à prendre</h2>
            <DecisionAPrendreView />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Plan de Paiement</h2>
            <PlanDePaiementView />
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
