
"use client";

import type { BaseEvent } from '../mutation-lifecycle/domain';

// Event - "Claim Check" Pattern
// This event is now very lightweight. It only contains the ID of the decision that was validated.
// Downstream processes will use this ID to look up the full details from a projection.
export interface DecisionValideeEvent extends BaseEvent {
    type: 'DECISION_VALIDEE';
    payload: {
        decisionId: string;
    }
}
