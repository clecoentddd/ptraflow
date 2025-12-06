
"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';
import type { DecisionDetail } from '../valider-decision/event';

// Event when the whole payment plan is replaced (for DROITS mutations)
export interface PlanPaiementRemplaceEvent extends BaseEvent {
    type: 'PLAN_PAIEMENT_REMPLACE';
    payload: {
        planDePaiementId: string;
        paiements: DecisionDetail[];
        dateDebut?: string;
        dateFin?: string;
    }
}

// Event when only a part of the payment plan is changed (for RESSOURCES mutations)
export interface PlanPaiementPatchedEvent extends BaseEvent {
    type: 'PLAN_PAIEMENT_PATCHE';
    payload: {
        planDePaiementId: string;
        paiements: DecisionDetail[];
    }
}
