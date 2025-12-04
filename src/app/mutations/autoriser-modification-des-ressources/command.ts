"use client";

// Command
export interface AutoriserModificationRessourcesCommand {
  type: 'AUTORISER_MODIFICATION_RESSOURCES';
  payload: {
    mutationId: string;
    ressourceVersionId: string;
  };
}
