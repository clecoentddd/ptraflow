
"use client";

import type { BaseEvent } from '../../mutations/mutation-lifecycle/domain';

// This event now serves as a marker that a decision was validated and transactions were processed.
export interface PlanDePaiementValideEvent extends BaseEvent {
    type: 'PLAN_DE_PAIEMENT_VALIDE';
    payload: {
        planDePaiementId: string;
        decisionId: string;
        detailCalcul: { month: string; aPayer: number }[];
    }
}
