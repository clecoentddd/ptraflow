
"use client";

import type { AppState, AppEvent } from '../../mutation-lifecycle/domain';
import type { MettreAJourEcritureCommand } from './command';
import type { EcriturePeriodeCorrigeeEvent } from '../corriger-periode-ecriture/event';
import type { RevenuAjouteEvent } from '../ajouter-revenu/event';
import type { DepenseAjouteeEvent } from '../ajouter-depense/event';
import { toast } from 'react-hot-toast';
import { format, parse } from 'date-fns';

function createAjoutEvent(
    type: 'revenu' | 'dépense',
    commandPayload: MettreAJourEcritureCommand['payload'],
    dateDebut: Date,
    dateFin: Date,
    timestamp: string,
): RevenuAjouteEvent | DepenseAjouteeEvent {
    const { mutationId, ressourceVersionId, newEcritureId, code, libelle, montant } = commandPayload;
    const commonPayload = {
        ecritureId: newEcritureId,
        code,
        libelle,
        montant,
        dateDebut: format(dateDebut, 'MM-yyyy'),
        dateFin: format(dateFin, 'MM-yyyy'),
    };

    if (type === 'revenu') {
        return {
            id: crypto.randomUUID(),
            type: 'REVENU_AJOUTE',
            mutationId, ressourceVersionId, timestamp,
            payload: commonPayload
        };
    } else {
        return {
            id: crypto.randomUUID(),
            type: 'DEPENSE_AJOUTEE',
            mutationId, ressourceVersionId, timestamp,
            payload: commonPayload
        };
    }
}


// Command Handler for "Update"
export function mettreAJourEcritureCommandHandler(
    state: AppState,
    command: MettreAJourEcritureCommand
): AppState {
    const {
        mutationId,
        ressourceVersionId,
        originalEcritureId,
        montant,
        code,
        ecritureType
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

    // Case 1: Montant or code changes. This is a "replace" operation.
    // We "delete" the old one by creating a correction event with an invalid period.
    // Then we add a brand new one.
    if (ecritureToUpdate.montant !== montant || ecritureToUpdate.code !== code) {
        
        // Step 1: Effectively "delete" the old ecriture by setting its period to be invalid.
        const originalDateDebutDt = parse(ecritureToUpdate.dateDebut, 'MM-yyyy', new Date());
        const invalidEndDate = new Date(originalDateDebutDt.getFullYear(), originalDateDebutDt.getMonth() -1, 1);
        
        const deleteEvent: EcriturePeriodeCorrigeeEvent = {
            id: crypto.randomUUID(),
            type: 'ECRITURE_PERIODE_CORRIGEE',
            mutationId,
            ressourceVersionId,
            timestamp: now.toISOString(),
            payload: {
                ecritureId: originalEcritureId,
                originalDateDebut: ecritureToUpdate.dateDebut,
                originalDateFin: ecritureToUpdate.dateFin,
                newDateDebut: ecritureToUpdate.dateDebut,
                newDateFin: format(invalidEndDate, 'MM-yyyy')
            }
        };
        events.push(deleteEvent);

        // Step 2: Add the new ecriture
        const addEvent = createAjoutEvent(ecritureType, command.payload, newDateDebut, newDateFin, new Date(now.getTime() + 1).toISOString());
        events.push(addEvent);

    } else { // Case 2: Only the period changes. This is a true period correction.
        const correctionEvent: EcriturePeriodeCorrigeeEvent = {
            id: crypto.randomUUID(),
            type: 'ECRITURE_PERIODE_CORRIGEE',
            mutationId,
            ressourceVersionId,
            timestamp: now.toISOString(),
            payload: {
                ecritureId: originalEcritureId,
                originalDateDebut: ecritureToUpdate.dateDebut,
                originalDateFin: ecritureToUpdate.dateFin,
                newDateDebut: format(newDateDebut, 'MM-yyyy'),
                newDateFin: format(newDateFin, 'MM-yyyy'),
            }
        };
        events.push(correctionEvent);
    }
    
    return { ...state, eventStream: [...events, ...state.eventStream] };
}
