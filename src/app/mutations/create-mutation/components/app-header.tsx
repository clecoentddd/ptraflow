
"use client";

import { Button } from "@/components/ui/button";
import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { CircleDotDashed, Plus } from "lucide-react";

export function AppHeader() {
  const { dispatch } = useCqrs();

  const handleCreateDroitsMutation = () => {
    dispatch({ type: 'CREATE_DROITS_MUTATION' });
  };

  const handleCreateRessourcesMutation = () => {
    dispatch({ type: 'CREATE_RESSOURCES_MUTATION' });
  };

  return (
    <header className="flex items-center justify-between p-4 bg-card border-b shadow-sm sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <CircleDotDashed className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">MutationFlow</h1>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleCreateDroitsMutation}>
          <Plus className="mr-2 h-4 w-4" />
          Créer mutation de droits
        </Button>
         <Button onClick={handleCreateRessourcesMutation} variant="secondary">
          <Plus className="mr-2 h-4 w-4" />
          Créer mutation de ressources
        </Button>
      </div>
    </header>
  );
}
