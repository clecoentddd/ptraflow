"use client";

import { Button } from "@/components/ui/button";
import { useCqrs } from "@/lib/cqrs.tsx";
import { CircleDotDashed, Plus } from "lucide-react";

export function AppHeader() {
  const { dispatch } = useCqrs();

  const handleCreateMutation = () => {
    dispatch({ type: 'CREATE_DROITS_MUTATION' });
  };

  return (
    <header className="flex items-center justify-between p-4 bg-card border-b shadow-sm sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <CircleDotDashed className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">MutationFlow</h1>
      </div>
      <Button onClick={handleCreateMutation}>
        <Plus className="mr-2 h-4 w-4" />
        Créer une mutation
      </Button>
    </header>
  );
}
