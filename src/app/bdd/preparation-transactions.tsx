
"use client";

import React from 'react';
import type { AppState, AppEvent } from '../mutations/mutation-lifecycle/domain';
import { TestComponent, mockToast } from '../mutations/bdd/test-harness';
import { cqrsReducer } from '../mutations/mutation-lifecycle/cqrs';
import type { PlanDePaiementValideEvent } from '../paiements/valider-plan-paiement/event';
import { preparerTransactionsCommandHandler } from '../paiements/preparer-transactions/handler';

export const BDDTestPreparationTransactions: React.FC = () => (
    <TestComponent
        title="Test Préparation des Transactions (Cas 1: Création initiale)"
        description="Etant donné un événement PLAN_DE_PAIEMENT_VALIDE contenant deux paiements à effectuer, quand le handler 'Préparer Transactions' est appelé, alors deux événements TRANSACTION_CREEE sont générés."
        given={() => {
            const planDePaiementId = "plan-abc";
            const mutationId = "mut-123";
            const event: AppEvent = {
                id: "evt-plan-valide",
                type: "PLAN_DE_PAIEMENT_VALIDE",
                mutationId: mutationId,
                timestamp: new Date().toISOString(),
                payload: {
                    planDePaiementId: planDePaiementId,
                    decisionId: "dec-xyz",
                    detailCalcul: [
                        { month: "08-2025", aPayer: 123 },
                        { month: "09-2025", aPayer: 67 },
                    ]
                }
            } as any; // Cast as any to include detailCalcul for the test
            return { eventStream: [event] };
        }}
        when={(initialState) => {
            let state = initialState;
            // Get the planDePaiementId from the GIVEN event
            const planEvent = initialState.eventStream[0] as PlanDePaiementValideEvent & { payload: { planDePaiementId: string } };
            
            // WHEN: we call the command handler via the reducer
            state = cqrsReducer(state, {
                type: 'PREPARER_TRANSACTIONS',
                payload: {
                    planDePaiementId: planEvent.payload.planDePaiementId,
                    mutationId: planEvent.mutationId
                }
            });
            return state;
        }}
        then={(state, toasts) => {
            // THEN: we check that two new TRANSACTION_CREEE events were created
            const createdTransactionEvents = state.eventStream.filter(e => e.type === 'TRANSACTION_CREEE');
            const pass = createdTransactionEvents.length === 2;

            const tx1 = createdTransactionEvents.find(e => (e.payload as any).mois === '08-2025');
            const tx2 = createdTransactionEvents.find(e => (e.payload as any).mois === '09-2025');

            const message = pass
                ? `Succès: 2 événements TRANSACTION_CREEE ont été générés. (Paiement 1: ${tx1?.payload.montant} CHF, Paiement 2: ${tx2?.payload.montant} CHF)`
                : `Échec: Attendu 2 événements TRANSACTION_CREEE, mais reçu ${createdTransactionEvents.length}.`;
            
            return { pass, message };
        }}
    />
);
