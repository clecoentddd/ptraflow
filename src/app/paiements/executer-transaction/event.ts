"use client";

import type { BaseEvent } from '../../mutations/mutation-lifecycle/domain';

// Event
export interface TransactionEffectueeEvent extends BaseEvent {
    type: 'TRANSACTION_EFFECTUEE';
    payload: {
        transactionId: string;
    }
}
