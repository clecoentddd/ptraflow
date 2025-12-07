
"use client";

import type { BaseEvent } from '../../mutations/mutation-lifecycle/domain';

export interface TransactionCreeeEvent extends BaseEvent {
    type: 'TRANSACTION_CREEE';
    payload: {
        transactionId: string;
        planDePaiementId: string;
        mois: string; // MM-yyyy
        montant: number;
    }
}

export interface TransactionRemplaceeEvent extends BaseEvent {
    type: 'TRANSACTION_REMPLACEE';
    payload: {
        transactionId: string; // The one being replaced
        remplaceeParTransactionId: string;
    }
}

export interface TransactionEffectueeEvent extends BaseEvent {
    type: 'TRANSACTION_EFFECTUEE';
    payload: {
        transactionId: string;
    }
}
