"use client";

import type { BaseEvent, MutationType } from '../mutation-lifecycle/domain';
import type { MonthlyResult } from '../shared/plan-de-calcul.service';

export interface DecisionDroitsPrepareeEvent extends BaseEvent {
    type: 'DECISION_DROITS_PREPAREE';
    payload: {
        decisionId: string;
        calculId: string;
        ressourceVersionId: string;
        planDePaiementId: string | null;
        mutationType: MutationType;
        periodeDroits?: { dateDebut: string; dateFin: string };
        detail: (MonthlyResult & { paiementsEffectues: number; aPayer: number })[];
    }
}
