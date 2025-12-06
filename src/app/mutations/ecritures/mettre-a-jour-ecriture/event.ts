
"use client";

import type { BaseEvent } from '../../mutation-lifecycle/domain';

// Event for the specific case where only the end date is changed
export interface EcritureDateFinModifieeEvent extends BaseEvent {
    type: 'ECRITURE_DATE_FIN_MODIFIEE';
    ressourceVersionId: string;
    payload: {
        ecritureId: string;
        ancienneDateFin: string; // format MM-yyyy
        nouvelleDateFin: string; // format MM-yyyy
    }
}
