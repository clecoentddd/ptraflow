
"use client";

import type { AppState, AppEvent, EcritureType } from '../../mutation-lifecycle/domain';
import type { MettreAJourEcritureCommand } from './command';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import type { RevenuAjouteEvent } from '../ajouter-revenu/event';
import type { DepenseAjouteeEvent } from '../ajouter-depense/event';
import type { EcritureSupprimeeEvent } from '../supprimer-ecriture/event';


function createAjoutEvent(
    type: EcritureType,
    commandPayload: MettreAJourEcritureCommand['payload'],
    timestamp: string,
): RevenuAjouteEvent | DepenseAjouteeEvent {
    const { mutationId, ressourceVersionId, newEcritureId, code, libelle, montant, dateDebut, dateFin } = commandPayload;
    
    const payload = {
        ecritureId: newEcritureId,
        code,
        libelle,
        montant,
        dateDebut: format(new Date(dateDebut), 'MM-yyyy'),
        dateFin: format(new Date(dateFin), 'MM-yyyy'),
    };

    if (type === 'revenu') {
        return {
            id: crypto.randomUUID(),
            type: 'REVENU_AJOUTE',
            mutationId, ressourceVersionId, timestamp,
            payload
        };
    } else {
        return {
            id: crypto.randomUUID(),
            type: 'DEPENSE_AJOUTEE',
            mutationId, ressourceVersionId, timestamp,
            payload
        };
    }
}


// Command Handler for "Update" using a "replace" (delete + add) pattern
export function mettreAJourEcritureCommandHandler(
    state: AppState,
    command: MettreAJourEcritureCommand
): AppState {
    const {
        originalEcritureId,
        montant,
        ecritureType,
        mutationId,
        ressourceVersionId,
    } = command.payload;

    const newDateDebut = new Date(command.payload.dateDebut);
    const newDateFin = new Date(command.payload.dateFin);

    // --- Validations ---
    const ecritureToUpdate = state.ecritures.find(e => e.id === originalEcritureId);
    if (!ecritureToUpdate) {
        toast.error("L'écriture à mettre à jour n'existe pas.");
        return state;
    }

    if (montant <= 0 || newDateDebut > newDateFin) {
        toast.error("Données de mise à jour invalides.");
        return state;
    }
    // --- End Validations ---
    
    const events: AppEvent[] = [];
    const now = new Date();

    // Step 1: Create a "delete" event for the old ecriture.
    const deleteEvent: EcritureSupprimeeEvent = {
        id: crypto.randomUUID(),
        type: 'ECRITURE_SUPPRIMEE',
        mutationId,
        ressourceVersionId,
        timestamp: now.toISOString(),
        payload: {
            ecritureId: originalEcritureId,
        }
    };
    events.push(deleteEvent);

    // Step 2: Create an "add" event for the new version of the ecriture.
    const addEvent = createAjoutEvent(ecritureType, command.payload, new Date(now.getTime() + 1).toISOString());
    events.push(addEvent);
    
    return { ...state, eventStream: [...events, ...state.eventStream] };
}
