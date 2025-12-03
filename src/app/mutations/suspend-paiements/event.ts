
"use client";

import type { BaseEvent } from '../mutation-lifecycle/cqrs';

// Event
export interface PaiementsSuspendusEvent extends BaseEvent {
    type: 'PAIEMENTS_SUSPENDUS';
    payload: {
        userEmail: string;
    }
}
