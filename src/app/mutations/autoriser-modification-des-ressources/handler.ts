
    "use client";
    
    import type { AppState } from '../mutation-lifecycle/cqrs';
    import type { AutoriserModificationRessourcesCommand } from './command';
    import type { ModificationRessourcesAutoriseeEvent } from './event';
    
    // Command Handler
    export function autoriserModificationRessourcesCommandHandler(state: AppState, command: AutoriserModificationRessourcesCommand): AppState {
      const { mutationId } = command.payload;
      
      const event: ModificationRessourcesAutoriseeEvent = {
        id: crypto.randomUUID(),
        type: 'MODIFICATION_RESSOURCES_AUTORISEE',
        mutationId,
        timestamp: new Date().toISOString(),
        payload: {
            userEmail: 'anonymous'
        }
      };
    
      return { ...state, eventStream: [event, ...state.eventStream] };
    }
    
        