"use client";

import type { AppState, AppEvent } from '../../mutation-lifecycle/domain';
import type { AjouterDepenseCommand } from './command';
import type { DepenseAjouteeEvent } from './event';
import { toast as realToast } from 'react-hot-toast';
import { format } from 'date-fns';
import { publishEvent } from '../../mutation-lifecycle/event-bus';

type HandlerDependencies = {
  toast: { error: (message: string) => void };
}

// Command Handler
export function ajouterDepenseCommandHandler(
    state: AppState,
    command: AjouterDepenseCommand,
    dependencies: HandlerDependencies = { toast: realToast }
): void {
    const { mutationId, ressourceVersionId, ecritureId, code, libelle, montant, dateDebut, dateFin } = command.payload;

    // Basic validation
    if (!code.startsWith('2')) {
        dependencies.toast.error("Le code d'une dépense doit commencer par '2'.");
        return;
    }
    if (montant <= 0) {
        dependencies.toast.error("Le montant doit être positif.");
        return;
    }
    if (new Date(dateDebut) > new Date(dateFin)) {
        dependencies.toast.error("La date de début ne peut pas être après la date de fin.");
        return;
    }

    const event: DepenseAjouteeEvent = {
        id: crypto.randomUUID(),
        type: 'DEPENSE_AJOUTEE',
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

    publishEvent(event);
}
