
"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';
import type { MutationType } from '../mutation-lifecycle/domain';

export interface DecisionDetail {
    month: string;
    calcul: number;
    paiementsEffectues: number;
    aPayer: number;
}

// Event
export interface DecisionValideeEvent extends BaseEvent {
    type: 'DECISION_VALIDEE';
    decisionId: string;
    ressourceVersionId: string;
    planDePaiementId: string;
    payload: {
        mutationType: MutationType;
        periodeDroits?: { dateDebut: string; dateFin: string };
        periodeModifications?: { dateDebut: string; dateFin: string };
        detailCalcul: DecisionDetail[];
    }
}
