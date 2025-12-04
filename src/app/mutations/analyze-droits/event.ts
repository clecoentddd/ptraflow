
"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';

// Event
export interface DroitsAnalysesEvent extends BaseEvent {
    type: 'DROITS_ANALYSES';
    payload: {
        userEmail: string;
        dateDebut: string;
        dateFin: string;
    }
}
