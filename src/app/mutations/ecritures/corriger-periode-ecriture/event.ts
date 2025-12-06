
"use client";

import type { BaseEvent } from '../../mutation-lifecycle/domain';

// Event
export interface EcriturePeriodeCorrigeeEvent extends BaseEvent {
    type: 'ECRITURE_PERIODE_CORRIGEE';
    ressourceVersionId: string;
    payload: {
        ecritureId: string;
        // The original period before the correction
        originalDateDebut: string; // format MM-yyyy
        originalDateFin: string; // format MM-yyyy
        // The new, corrected period
        newDateDebut: string; // format MM-yyyy
        newDateFin: string; // format MM-yyyy
    }
}
