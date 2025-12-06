
"use client";

import type { BaseEvent } from '../../mutation-lifecycle/domain';

// This event is no longer used, but kept for reference or potential future use.
// We are now using a simpler "replace" (delete + add) pattern.

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
