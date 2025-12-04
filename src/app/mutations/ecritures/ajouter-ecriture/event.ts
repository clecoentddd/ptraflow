
"use client";

import type { BaseEvent } from '../../mutation-lifecycle/domain';

// Event
export interface EcritureAjouteeEvent extends BaseEvent {
    type: 'ECRITURE_AJOUTEE';
    ressourceVersionId: string;
    payload: {
        ecritureId: string;
        typeEcriture: 'revenu' | 'depense';
        code: string;
        libelle: string;
        montant: number;
        dateDebut: string; // format MM-yyyy
        dateFin: string; // format MM-yyyy
    }
}
