"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';

// Event
export interface MutationAnnuleeEvent extends BaseEvent {
    type: 'MUTATION_ANNULEE';
    payload: {
        userEmail: string;
        reason: string;
    }
}
