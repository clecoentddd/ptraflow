
"use client";

import { Button } from "@/components/ui/button";
import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import { CircleDotDashed, Plus } from "lucide-react";
import { queryMutations } from "../../projection-mutations/projection";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between p-4 bg-card border-b shadow-sm sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <CircleDotDashed className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">MutationFlow</h1>
      </div>
    </header>
  );
}
