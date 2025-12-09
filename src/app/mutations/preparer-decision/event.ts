
"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';
import type { MonthlyResult } from '../shared/plan-de-calcul.service';

// Event
export interface DecisionPreparteeEvent extends BaseEvent {
    type: 'DECISION_PREPAREE';
    payload: {
        mutationId: string;
        decisionId: string;
        calculId: string;
        planDePaiementId: string | null;
        detail: (MonthlyResult & { paiementsEffectues: number; aPayer: number })[];
    }
}
