
"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';
import type { MonthlyResult } from '../shared/plan-de-calcul.service';

// Event
export interface PlanCalculeEvent extends BaseEvent {
    type: 'PLAN_CALCUL_EFFECTUE';
    ressourceVersionId: string;
    payload: {
        calculId: string;
        detail: MonthlyResult[];
    }
}
