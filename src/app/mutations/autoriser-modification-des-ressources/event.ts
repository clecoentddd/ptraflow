
    "use client";
    
    import type { BaseEvent } from '../mutation-lifecycle/cqrs';
    
    // Event
    export interface ModificationRessourcesAutoriseeEvent extends BaseEvent {
        type: 'MODIFICATION_RESSOURCES_AUTORISEE';
        payload: {
            userEmail: string;
        }
    }
    
        