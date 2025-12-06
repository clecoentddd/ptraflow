
"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';
import type { DecisionDetail } from '../valider-decision/event';

// Event when the whole payment plan is replaced (for DROITS mutations)
export interface PlanDePaiementValideEvent extends BaseEvent {
    type: 'PLAN_DE_PAIEMENT_VALIDE';
    payload: {
        planDePaiementId: string;
        paiements: (DecisionDetail & { transactionId: string })[];
        dateDebut?: string;
        dateFin?: string;
    }
}
