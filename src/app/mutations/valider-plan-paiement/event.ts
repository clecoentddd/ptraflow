
"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';

// Event
export interface PlanPaiementValideEvent extends BaseEvent {
    type: 'PLAN_PAIEMENT_VALIDE';
    payload: {
        userEmail: string;
        dateDebut?: string;
        dateFin?: string;
    }
}
