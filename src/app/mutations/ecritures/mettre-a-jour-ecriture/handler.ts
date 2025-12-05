"use client";

import type { AppState } from '../../mutation-lifecycle/domain';
import type { MettreAJourEcritureCommand } from './command';
import type { EcritureSupprimeeEvent } from '../supprimer-ecriture/event';
import type { RevenuAjouteEvent } from '../ajouter-revenu/event';
import type { DepenseAjouteeEvent } from '../ajouter-depense/event';
import type { EcritureMiseAJourEvent } from './event';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

// Command Handler for "Update"
// This handler is special: it creates TWO events in sequence:
// 1. EcritureSupprimeeEvent to "remove" the old one.
// 2. RevenuAjouteEvent or DepenseAjouteeEvent to add the new one.
export function mettreAJourEcritureCommandHandler(
    state: AppState,
    command: MettreAJourEcritureCommand
): AppState {
    const { 
        mutationId,
        ressourceVersionId,
        originalEcritureId,
        newEcritureId,
        ecritureType,
        code,
        libelle,
        montant,
        dateDebut,
        dateFin
    } = command.payload;

    // --- Validations ---
    const ecritureToUpdate = state.ecritures.find(e => e.id === originalEcritureId);
    if (!ecritureToUpdate) {
        toast.error("L'écriture que vous essayez de mettre à jour n'existe pas.");
        return state;
    }

    if (montant <= 0) {
        toast.error("Le montant doit être positif.");
        return state;
    }
    if (new Date(dateDebut) > new Date(dateFin)) {
        toast.error("La date de début ne peut pas être après la date de fin.");
        return state;
    }
    if (ecritureType === 'revenu' && !code.startsWith('1')) {
        toast.error("Le code d'un revenu doit commencer par '1'.");
        return state;
    }
    if (ecritureType === 'dépense' && !code.startsWith('2')) {
        toast.error("Le code d'une dépense doit commencer par '2'.");
        return state;
    }
    // --- End Validations ---

    // Create the "delete" event
    const suppressionEvent: EcritureSupprimeeEvent = {
        id: crypto.randomUUID(),
        type: 'ECRITURE_SUPPRIMEE',
        mutationId,
        ressourceVersionId,
        timestamp: new Date().toISOString(),
        payload: {
            ecritureId: originalEcritureId,
        }
    };
    
    // Create the "add" event based on the type
    let ajoutEvent: RevenuAjouteEvent | DepenseAjouteeEvent;
    const now = new Date();
    // Add 1ms to ensure the add event is always after the delete event
    const timestampAjout = new Date(now.getTime() + 1).toISOString(); 

    if (ecritureType === 'revenu') {
        ajoutEvent = {
            id: crypto.randomUUID(),
            type: 'REVENU_AJOUTE',
            mutationId,
            ressourceVersionId,
            timestamp: timestampAjout,
            payload: {
                ecritureId: newEcritureId,
                code,
                libelle,
                montant,
                dateDebut: format(new Date(dateDebut), 'MM-yyyy'),
                dateFin: format(new Date(dateFin), 'MM-yyyy'),
            }
        };
    } else { // dépense
        ajoutEvent = {
            id: crypto.randomUUID(),
            type: 'DEPENSE_AJOUTEE',
            mutationId,
            ressourceVersionId,
            timestamp: timestampAjout,
            payload: {
                ecritureId: newEcritureId,
                code,
                libelle,
                montant,
                dateDebut: format(new Date(dateDebut), 'MM-yyyy'),
                dateFin: format(new Date(dateFin), 'MM-yyyy'),
            }
        };
    }

    // This is an "orchestration" event, it doesn't have a projector
    // but it is useful for tracing what happened.
    const miseAJourEvent: EcritureMiseAJourEvent = {
        id: crypto.randomUUID(),
        type: 'ECRITURE_MISE_A_JOUR',
        mutationId,
        ressourceVersionId,
        timestamp: new Date(now.getTime() + 2).toISOString(), // ensure it's last
        payload: {
            originalEcritureId,
            newEcritureId,
        }
    };

    // Add the two (or three) new events to the stream.
    // Order is important: delete first, then add, then the meta-event.
    return { ...state, eventStream: [miseAJourEvent, ajoutEvent, suppressionEvent, ...state.eventStream] };
}
