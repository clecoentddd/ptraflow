"use client";

import type { AppState } from '../../mutation-lifecycle/domain';
import type { SupprimerEcritureCommand } from './command';
import type { EcritureSupprimeeEvent } from './event';

// Command Handler
export function supprimerEcritureCommandHandler(
    state: AppState,
    command: SupprimerEcritureCommand
): AppState {
    const { mutationId, ressourceVersionId, ecritureId } = command.payload;

    // Optional: Check if the ecriture exists before creating the event
    const ecritureExists = state.ecritures.some(e => e.id === ecritureId && e.ressourceVersionId === ressourceVersionId);
    if (!ecritureExists) {
        // Silently fail or toast an error, for now we fail silently
        console.warn(`Tentative de suppression d'une écriture non trouvée: ${ecritureId}`);
        return state;
    }

    const event: EcritureSupprimeeEvent = {
        id: crypto.randomUUID(),
        type: 'ECRITURE_SUPPRIMEE',
        mutationId,
        ressourceVersionId,
        timestamp: new Date().toISOString(),
        payload: {
            ecritureId,
        }
    };

    return { ...state, eventStream: [event, ...state.eventStream] };
}
