"use client";

// Command
export interface ValiderModificationRessourcesCommand {
  type: 'VALIDER_MODIFICATION_RESSOURCES';
  payload: {
    mutationId: string;
    ressourceVersionId: string;
  };
}
