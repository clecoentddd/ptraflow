"use client";

// Command
export interface AjouterRevenuCommand {
  type: 'AJOUTER_REVENU';
  payload: {
    mutationId: string;
    ressourceVersionId: string;
    ecritureId: string;
    code: string;
    libelle: string;
    montant: number;
    dateDebut: string; // format YYYY-MM-DD
    dateFin: string; // format YYYY-MM-DD
  };
}
