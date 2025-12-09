
"use client";

// Command
export interface ValiderModificationRessourcesCommand {
  type: 'VALIDER_MODIFICATION_RESSOURCES';
  payload: {
    mutationId: string;
    // ressourceVersionId is now sourced from state by the handler
  };
}
