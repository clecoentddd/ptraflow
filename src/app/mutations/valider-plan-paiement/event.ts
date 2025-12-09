
"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';

// This event now serves as a marker that a decision was validated and contains all payment details.
// The event's own `id` is the `planDePaiementId`.
export interface PlanDePaiementValideEvent extends BaseEvent {
    type: 'PLAN_DE_PAIEMENT_VALIDE';
    payload: {
        decisionId: string;
        detailCalcul: { month: string; aPayer: number }[];
    }
}
