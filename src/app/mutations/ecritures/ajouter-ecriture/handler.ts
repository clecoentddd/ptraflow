
"use client";

import type { AppState } from '../../mutation-lifecycle/domain';
import type { AjouterEcritureCommand } from './command';
import type { EcritureAjouteeEvent } from './event';
import { toast as realToast } from 'react-hot-toast';

type HandlerDependencies = {
  toast: { error: (message: string) => void };
}

// Command Handler
export function ajouterEcritureCommandHandler(
    state: AppState,
    command: AjouterEcritureCommand,
    dependencies: HandlerDependencies = { toast: realToast }
): AppState {
    const { mutationId, ressourceVersionId, ecritureId, typeEcriture, code, libelle, montant, dateDebut, dateFin } = command.payload;

    // Basic validation
    if (montant <= 0) {
        dependencies.toast.error("Le montant doit être positif.");
        return state;
    }
    if (new Date(dateDebut) > new Date(dateFin)) {
        dependencies.toast.error("La date de début ne peut pas être après la date de fin.");
        return state;
    }

    const event: EcritureAjouteeEvent = {
        id: crypto.randomUUID(),
        type: 'ECRITURE_AJOUTEE',
        mutationId,
        ressourceVersionId,
        timestamp: new Date().toISOString(),
        payload: {
            ecritureId,
            typeEcriture,
            code,
            libelle,
            montant,
            dateDebut,
            dateFin,
        }
    };

    return { ...state, eventStream: [event, ...state.eventStream] };
}
