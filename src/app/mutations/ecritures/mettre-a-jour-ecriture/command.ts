"use client";

import type { Ecriture, EcritureType } from "../../mutation-lifecycle/domain";

// Command
export interface MettreAJourEcritureCommand {
  type: 'METTRE_A_JOUR_ECRITURE';
  payload: {
    mutationId: string;
    ressourceVersionId: string;
    
    // ID of the ecriture to replace
    originalEcritureId: string;

    // New data
    newEcritureId: string;
    ecritureType: EcritureType;
    code: string;
    libelle: string;
    montant: number;
    dateDebut: string; // ISO Date String
    dateFin: string; // ISO Date String
  };
}
