"use client";

import type { AppState, AppEvent } from '../../mutation-lifecycle/domain';
import type { MettreAJourEcritureCommand } from './command';
import { toast } from 'react-hot-toast';
import { format, parse } from 'date-fns';
import type { RevenuAjouteEvent } from '../ajouter-revenu/event';
import type { DepenseAjouteeEvent } from '../ajouter-depense/event';
import type { EcritureSupprimeeEvent } from '../supprimer-ecriture/event';
import type { EcriturePeriodeCorrigeeEvent } from './event';

// Command Handler for "Update"
export function mettreAJourEcritureCommandHandler(
    state: AppState,
    command: MettreAJourEcritureCommand,
    dispatch: (events: AppEvent[]) => void,
): void {
    const {
        originalEcritureId,
        newEcritureId,
        ecritureType,
        code,
        libelle,
        montant,
        mutationId,
        ressourceVersionId,
    } = command.payload;

    const newDateDebut = parse(command.payload.dateDebut, "yyyy-MM-dd'T'HH:mm:ss.SSSX", new Date());
    const newDateFin = parse(command.payload.dateFin, "yyyy-MM-dd'T'HH:mm:ss.SSSX", new Date());

    // --- Validations ---
    const ecritureToUpdate = state.ecritures.find(e => e.id === originalEcritureId);
    if (!ecritureToUpdate) {
        toast.error("L'écriture à mettre à jour n'existe pas.");
        return;
    }

    if (montant <= 0 || newDateDebut > newDateFin) {
        toast.error("Données de mise à jour invalides.");
        return;
    }
    // --- End Validations ---
    
    const events: AppEvent[] = [];
    const now = new Date();

    const isOnlyPeriodChanged =
        ecritureToUpdate.code === code &&
        ecritureToUpdate.montant === montant &&
        (ecritureToUpdate.dateDebut !== format(newDateDebut, 'MM-yyyy') ||
         ecritureToUpdate.dateFin !== format(newDateFin, 'MM-yyyy'));

    if (isOnlyPeriodChanged) {
        // --- SCENARIO 1: Only the period is modified ---
        const periodeCorrigeeEvent: EcriturePeriodeCorrigeeEvent = {
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
        events.push(periodeCorrigeeEvent);
    } else {
        // --- SCENARIO 2: Other fields changed, use the "replace" pattern ---

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
        const addPayload = {
            ecritureId: newEcritureId,
            code, libelle, montant,
            dateDebut: format(newDateDebut, 'MM-yyyy'),
            dateFin: format(newDateFin, 'MM-yyyy'),
        };

        const addEvent: RevenuAjouteEvent | DepenseAjouteeEvent = ecritureType === 'revenu'
            ? {
                id: crypto.randomUUID(),
                type: 'REVENU_AJOUTE',
                mutationId, ressourceVersionId,
                timestamp: new Date(now.getTime() + 1).toISOString(), // Ensure order
                payload: addPayload
              }
            : {
                id: crypto.randomUUID(),
                type: 'DEPENSE_AJOUTEE',
                mutationId, ressourceVersionId,
                timestamp: new Date(now.getTime() + 1).toISOString(), // Ensure order
                payload: addPayload
              };
        events.push(addEvent);
    }
    
    dispatch(events);
}
