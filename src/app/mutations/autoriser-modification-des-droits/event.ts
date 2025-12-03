"use client";

import type { BaseEvent } from '../mutation-lifecycle/cqrs';

// Event
export interface ModificationAutoriseeEvent extends BaseEvent {
    type: 'MODIFICATION_AUTORISEE';
    payload: {
        userEmail: string;
    }
}

    