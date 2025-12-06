
"use client";

import type { BaseEvent } from '../../mutation-lifecycle/domain';

// Event
export interface EcriturePeriodeCorrigeeEvent extends BaseEvent {
    type: 'ECRITURE_PERIODE_CORRIGEE';
    ressourceVersionId: string;
    payload: {
        ecritureId: string;
        dateDebut: string; // format MM-yyyy
        dateFin: string; // format MM-yyyy
    }
}
