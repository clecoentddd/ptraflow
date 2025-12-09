"use client";

import type { AppState, AppEvent } from '../../mutation-lifecycle/domain';
import type { SupprimerEcritureCommand } from './command';
import type { EcritureSupprimeeEvent } from './event';
import { toast } from 'react-hot-toast';
import { publishEvent } from '../../mutation-lifecycle/event-bus';

// Command Handler
export function supprimerEcritureCommandHandler(
    state: AppState,
    command: SupprimerEcritureCommand
): void {
    const { mutationId, ressourceVersionId, ecritureId } = command.payload;

    // The business rule is that we can delete any 'ecriture' as long as we are in an authorized context.
    // The UI should already prevent this if not authorized, but this is a double check.
    const isAuthorized = state.eventStream.some(e => e.type === 'MODIFICATION_RESSOURCES_AUTORISEE' && e.mutationId === mutationId);
    if(!isAuthorized) {
        toast.error("Action non autorisée. La suppression d'écriture n'est pas permise.");
        return;
    }

    const ecritureExists = state.ecritures.some(e => e.id === ecritureId);
    if (!ecritureExists) {
        console.warn(`Tentative de suppression d'une écriture non trouvée: ${ecritureId}`);
        toast.error("L'écriture que vous essayez de supprimer n'existe pas ou plus.");
        return;
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

    publishEvent(event);
}
