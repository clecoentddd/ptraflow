
"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';

// Event
export interface ModificationRessourcesAutoriseeEvent extends BaseEvent {
    type: 'MODIFICATION_RESSOURCES_AUTORISEE';
    ressourceVersionId: string;
    payload: {
        userEmail: string;
    }
}
