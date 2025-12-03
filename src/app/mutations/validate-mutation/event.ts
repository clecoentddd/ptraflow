"use client";

import type { BaseEvent } from '../mutation-lifecycle/cqrs';

// Event
export interface MutationValidatedEvent extends BaseEvent {
    type: 'MUTATION_VALIDATED';
    payload: {
        userEmail: string;
        dateDebut?: string;
        dateFin?: string;
    }
}
