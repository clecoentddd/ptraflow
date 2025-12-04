
"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';

// Event
export interface ModificationDroitsAutoriseeEvent extends BaseEvent {
    type: 'MODIFICATION_DROITS_AUTORISEE';
    payload: {
        userEmail: string;
    }
}
