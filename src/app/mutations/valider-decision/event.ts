"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';
import type { MonthlyResult } from '../shared/plan-de-calcul.service';
import type { MutationType } from '../mutation-lifecycle/domain';

// Event
export interface DecisionValideeEvent extends BaseEvent {
    type: 'DECISION_VALIDEE';
    payload: {
        decisionId: string;
        mutationType: MutationType;
        planDeCalculId?: string;
        ressourceVersionId: string;
        detailCalcul: MonthlyResult[];
    }
}
