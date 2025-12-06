
"use client";

import type { AppState, AppEvent } from '../../mutation-lifecycle/domain';
import type { MettreAJourEcritureCommand } from './command';
import type { EcriturePeriodeCorrigeeEvent } from '../corriger-periode-ecriture/event';
import type { RevenuAjouteEvent } from '../ajouter-revenu/event';
import type { DepenseAjouteeEvent } from '../ajouter-depense/event';
import { toast } from 'react-hot-toast';
import { format, parse, isSameMonth, isBefore, isAfter, endOfMonth, addMonths, subMonths } from 'date-fns';

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
        newEcritureId,
        ecritureType,
        code,
        libelle,
        montant,
    } = command.payload;

    const dateDebut = new Date(command.payload.dateDebut);
    const dateFin = new Date(command.payload.dateFin);

    // --- Validations ---
    const ecritureToUpdate = state.ecritures.find(e => e.id === originalEcritureId);
    if (!ecritureToUpdate) {
        toast.error("L'écriture à mettre à jour n'existe pas.");
        return state;
    }

    if (montant <= 0 || new Date(dateDebut) > new Date(dateFin)) {
        toast.error("Données de mise à jour invalides.");
        return state;
    }
    // --- End Validations ---
    
    const originalDateDebut = parse(ecritureToUpdate.dateDebut, 'MM-yyyy', new Date());
    const originalDateFin = parse(ecritureToUpdate.dateFin, 'MM-yyyy', new Date());
    
    const events: AppEvent[] = [];
    const now = new Date();

    // Case 1: The amount changes. This is not a "correction", it's a new fact.
    // We shorten the original period and create a new entry for the new amount's period.
    if (ecritureToUpdate.montant !== montant || ecritureToUpdate.code !== code) {
         // This is a simplification: we replace the old with the new.
         // A more complex logic could handle splitting periods. For now, we "correct" the original
         // to end just before the new one starts if there is an overlap.
        
        // Event 1: Correct the original entry's period to end before the new one starts
        if (isBefore(dateDebut, originalDateFin) || isSameMonth(dateDebut, originalDateFin)) {
            const newEndDateForOriginal = subMonths(dateDebut, 1);
            if (isBefore(originalDateDebut, newEndDateForOriginal) || isSameMonth(originalDateDebut, newEndDateForOriginal)) {
                 const correctionEvent: EcriturePeriodeCorrigeeEvent = {
                    id: crypto.randomUUID(),
                    type: 'ECRITURE_PERIODE_CORRIGEE',
                    mutationId,
                    ressourceVersionId,
                    timestamp: now.toISOString(),
                    payload: {
                        ecritureId: originalEcritureId,
                        dateDebut: ecritureToUpdate.dateDebut, // Keep original start
                        dateFin: format(newEndDateForOriginal, 'MM-yyyy')
                    }
                };
                events.push(correctionEvent);
            } else {
                 // The new period completely covers the old one, so we effectively delete the old one by setting its period to zero length.
                 // This is a conceptual delete for the projection.
                 const correctionEvent: EcriturePeriodeCorrigeeEvent = {
                    id: crypto.randomUUID(),
                    type: 'ECRITURE_PERIODE_CORRIGEE',
                    mutationId,
                    ressourceVersionId,
                    timestamp: now.toISOString(),
                    payload: {
                        ecritureId: originalEcritureId,
                        dateDebut: ecritureToUpdate.dateDebut,
                        dateFin: format(subMonths(parse(ecritureToUpdate.dateDebut, 'MM-yyyy', new Date()), 1), 'MM-yyyy')
                    }
                };
                 events.push(correctionEvent);
            }
        }
        
        // Event 2: Add the new entry for its full period
        const ajoutEvent = createAjoutEvent(ecritureType, command.payload, dateDebut, dateFin, new Date(now.getTime() + 1).toISOString());
        events.push(ajoutEvent);

    } else { // Case 2: Only the period changes. This is a true period correction.
        const correctionEvent: EcriturePeriodeCorrigeeEvent = {
            id: crypto.randomUUID(),
            type: 'ECRITURE_PERIODE_CORRIGEE',
            mutationId,
            ressourceVersionId,
            timestamp: now.toISOString(),
            payload: {
                ecritureId: originalEcritureId,
                dateDebut: format(dateDebut, 'MM-yyyy'),
                dateFin: format(dateFin, 'MM-yyyy'),
            }
        };
        events.push(correctionEvent);
    }
    
    return { ...state, eventStream: [...events, ...state.eventStream] };
}
