
"use client";

import type { BaseEvent } from '../../mutation-lifecycle/domain';

// Event for the specific case where only date(s) are changed
export interface EcriturePeriodeCorrigeeEvent extends BaseEvent {
    type: 'ECRITURE_PERIODE_CORRIGEE';
    ressourceVersionId: string;
    payload: {
        ecritureId: string;
        originalDateDebut: string; // MM-yyyy
        originalDateFin: string;   // MM-yyyy
        newDateDebut: string;      // MM-yyyy
        newDateFin: string;        // MM-yyyy
    }
}
