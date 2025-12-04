"use client";

import type { AppState } from '../../mutation-lifecycle/domain';
import type { AjouterRevenuCommand } from './command';
import type { RevenuAjouteEvent } from './event';
import { toast as realToast } from 'react-hot-toast';
import { format } from 'date-fns';

type HandlerDependencies = {
  toast: { error: (message: string) => void };
}

// Command Handler
export function ajouterRevenuCommandHandler(
    state: AppState,
    command: AjouterRevenuCommand,
    dependencies: HandlerDependencies = { toast: realToast }
): AppState {
    const { mutationId, ressourceVersionId, ecritureId, code, libelle, montant, dateDebut, dateFin } = command.payload;

    // Basic validation
    if (!code.startsWith('1')) {
        dependencies.toast.error("Le code d'un revenu doit commencer par '1'.");
        return state;
    }
    if (montant <= 0) {
        dependencies.toast.error("Le montant doit être positif.");
        return state;
    }
    if (new Date(dateDebut) > new Date(dateFin)) {
        dependencies.toast.error("La date de début ne peut pas être après la date de fin.");
        return state;
    }

    const event: RevenuAjouteEvent = {
        id: crypto.randomUUID(),
        type: 'REVENU_AJOUTE',
        mutationId,
        ressourceVersionId,
        timestamp: new Date().toISOString(),
        payload: {
            ecritureId,
            code,
            libelle,
            montant,
            dateDebut: format(new Date(dateDebut), 'MM-yyyy'),
            dateFin: format(new Date(dateFin), 'MM-yyyy'),
        }
    };

    return { ...state, eventStream: [event, ...state.eventStream] };
}
