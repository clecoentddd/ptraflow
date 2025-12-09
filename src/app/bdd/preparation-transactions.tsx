
"use client";

import React from 'react';
import type { AppState, AppEvent } from '../mutations/mutation-lifecycle/domain';
import { TestComponent } from '../mutations/bdd/test-harness';
import { EventBus, rehydrateStateForTesting } from '../mutations/mutation-lifecycle/event-bus';
import type { PlanDePaiementValideEvent } from '../mutations/valider-plan-paiement/event';

export const BDDTestPreparationTransactions: React.FC = () => (
    <TestComponent
        title="Test Préparation des Transactions (Cas 1: Création initiale)"
        description="Etant donné un événement PLAN_DE_PAIEMENT_VALIDE contenant deux paiements à effectuer, quand le système traite cet événement, alors deux événements TRANSACTION_CREEE sont générés automatiquement."
        given={() => {
            const planDePaiementId = "plan-abc";
            const mutationId = "mut-123";
            const event: PlanDePaiementValideEvent = {
                id: planDePaiementId, // The event ID is the plan ID
                type: "PLAN_DE_PAIEMENT_VALIDE",
                mutationId: mutationId,
                timestamp: new Date().toISOString(),
                payload: {
                    decisionId: "dec-xyz",
                    detailCalcul: [
                        { month: "08-2025", aPayer: 123 },
                        { month: "09-2025", aPayer: 67 },
                    ]
                }
            };
            return { eventStream: [event] };
        }}
        when={(initialState) => {
            // WHEN: we rehydrate the state. The process manager in the event bus
            // will be triggered automatically.
            rehydrateStateForTesting(initialState.eventStream);
            return EventBus.getState();
        }}
        then={(state) => {
            // THEN: we check that two new TRANSACTION_CREEE events were created
            // in addition to the initial event.
            const createdTransactionEvents = state.eventStream.filter(e => e.type === 'TRANSACTION_CREEE');
            const pass = state.eventStream.length === 3 && createdTransactionEvents.length === 2;

            const tx1 = createdTransactionEvents.find(e => (e.payload as any).mois === '08-2025');
            const tx2 = createdTransactionEvents.find(e => (e.payload as any).mois === '09-2025');

            const message = pass
                ? `Succès: 2 événements TRANSACTION_CREEE ont été générés. (Paiement 1: ${tx1?.payload.montant} CHF, Paiement 2: ${tx2?.payload.montant} CHF)`
                : `Échec: Attendu 3 événements au total (1 PLAN_VALIDE + 2 TRANSACTION_CREEE), mais reçu ${state.eventStream.length}. Transactions créées: ${createdTransactionEvents.length}.`;
            
            return { pass, message };
        }}
    />
);
