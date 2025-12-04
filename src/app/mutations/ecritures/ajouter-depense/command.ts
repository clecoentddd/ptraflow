"use client";

// Command
export interface AjouterDepenseCommand {
  type: 'AJOUTER_DEPENSE';
  payload: {
    mutationId: string;
    ressourceVersionId: string;
    ecritureId: string;
    code: string;
    libelle: string;
    montant: number;
    dateDebut: string; // ISO Date String
    dateFin: string; // ISO Date String
  };
}
