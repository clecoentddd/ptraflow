"use client";

import type { BaseEvent } from '../../mutation-lifecycle/domain';

// Event
export interface EcritureSupprimeeEvent extends BaseEvent {
    type: 'ECRITURE_SUPPRIMEE';
    ressourceVersionId: string;
    payload: {
        ecritureId: string;
    }
}
