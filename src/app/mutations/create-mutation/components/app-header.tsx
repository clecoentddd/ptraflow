
"use client";

import { Button } from "@/components/ui/button";
import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { CircleDotDashed, Plus } from "lucide-react";
import { queryMutations } from "../../projection-mutations/projection";
import { toast } from "react-hot-toast";

export function AppHeader() {
  const { state, dispatch } = useCqrs();
  const mutations = queryMutations(state);

  // Logique de validation déplacée ici, depuis le handler.
  const existingMutation = mutations.find(m => m.status === 'OUVERTE' || m.status === 'EN_COURS');

  const handleCreateDroitsMutation = () => {
    if (existingMutation) {
      toast.error(`La mutation ${existingMutation.id} est déjà en cours.`);
      return;
    }
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
        <Button onClick={handleCreateDroitsMutation} disabled={!!existingMutation}>
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
