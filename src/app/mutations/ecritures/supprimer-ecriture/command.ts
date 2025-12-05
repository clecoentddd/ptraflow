"use client";

// Command
export interface SupprimerEcritureCommand {
  type: 'SUPPRIMER_ECRITURE';
  payload: {
    mutationId: string;
    ressourceVersionId: string;
    ecritureId: string;
  };
}
