"use client";

import type { BaseEvent } from '../../mutation-lifecycle/domain';

// This is an "orchestration" event that represents the update action.
// It wraps the two actual events that will be generated (delete + add).
export interface EcritureMiseAJourEvent extends BaseEvent {
    type: 'ECRITURE_MISE_A_JOUR';
    ressourceVersionId: string;
    payload: {
        originalEcritureId: string;
        newEcritureId: string;
    }
}
