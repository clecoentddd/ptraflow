"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';

// Event
export interface ModificationRessourcesValideeEvent extends BaseEvent {
    type: 'MODIFICATION_RESSOURCES_VALIDEE';
    ressourceVersionId: string;
    payload: {
        userEmail: string;
    }
}
