
"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';

// Event
export interface MutationValidatedEvent extends BaseEvent {
    type: 'MUTATION_VALIDATED';
    payload: {
        userEmail: string;
        dateDebut?: string;
        dateFin?: string;
    }
}
