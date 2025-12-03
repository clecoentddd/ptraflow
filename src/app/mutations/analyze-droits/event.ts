"use client";

import type { BaseEvent } from '../mutation-lifecycle/cqrs';

// Event
export interface DroitsAnalysesEvent extends BaseEvent {
    type: 'DROITS_ANALYSES';
    payload: {
        userEmail: string;
    }
}
