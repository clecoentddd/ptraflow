
"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';

// Event
export interface PaiementsSuspendusEvent extends BaseEvent {
    type: 'PAIEMENTS_SUSPENDUS';
    payload: {
        userEmail: string;
    }
}
