
"use client";

// Command
export interface AjouterEcritureCommand {
  type: 'AJOUTER_ECRITURE';
  payload: {
    mutationId: string;
    ressourceVersionId: string;
    ecritureId: string;
    typeEcriture: 'revenu' | 'depense';
    code: string;
    libelle: string;
    montant: number;
    dateDebut: string;
    dateFin: string;
  };
}
