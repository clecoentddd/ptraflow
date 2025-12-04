"use client";

import type { BaseEvent } from '../../mutation-lifecycle/domain';

// Event
export interface RevenuAjouteEvent extends BaseEvent {
    type: 'REVENU_AJOUTE';
    ressourceVersionId: string;
    payload: {
        ecritureId: string;
        code: string;
        libelle: string;
        montant: number;
        dateDebut: string; // format MM-yyyy
        dateFin: string; // format MM-yyyy
    }
}
