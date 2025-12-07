
"use client";

import React from 'react';
import type { AppState, AppEvent } from '../mutations/mutation-lifecycle/domain';
import { TestComponent } from '../mutations/bdd/test-harness';
import { cqrsReducer } from '../mutations/mutation-lifecycle/cqrs';
import type { PlanDePaiementValideEvent } from '../paiements/valider-plan-paiement/event';
import type { TransactionEffectueeEvent } from '../paiements/projection-transactions/events';
import { queryDecisionsAPrendre } from '../mutations/projection-decision-a-prendre/projection';

// Création d'un ensemble cohérent d'IDs pour le test
const ID_MUTATION_1 = 'mut-1-reconciliation';
const ID_PLAN_1 = 'plan-1-reconciliation';
const ID_TX_OCT_1 = 'tx-oct-1';
const ID_TX_NOV_1 = 'tx-nov-1';
const ID_TX_DEC_1 = 'tx-dec-1';

const ID_MUTATION_2 = 'mut-2-reconciliation';
const ID_PLAN_2 = 'plan-2-reconciliation';


const TestReconciliationTransactions: React.FC = () => (
    <TestComponent
        title="Test de Réconciliation des Transactions"
        description="Étant donné un plan de paiement partiellement exécuté, quand une nouvelle décision change les montants futurs, alors le système doit remplacer les anciennes transactions 'à exécuter' et créer de nouvelles transactions pour la différence des mois déjà payés."
        given={() => {
            // GIVEN: Un premier plan de paiement a été créé et partiellement payé
            const events: AppEvent[] = [
                 // 1. Création du premier plan de paiement
                {
                    id: 'evt-plan-1',
                    type: 'PLAN_DE_PAIEMENT_VALIDE',
                    mutationId: ID_MUTATION_1,
                    timestamp: '2025-01-15T10:00:00.000Z',
                    payload: {
                        planDePaiementId: ID_PLAN_1,
                        decisionId: 'dec-1',
                        detailCalcul: [
                            { month: '10-2025', aPayer: 500 },
                            { month: '11-2025', aPayer: 300 },
                            { month: '12-2025', aPayer: 300 },
                        ],
                    },
                } as PlanDePaiementValideEvent,
                
                // Le processeur automatique aurait créé ces transactions (simulé ici pour le 'given')
                // Note: La logique de création est maintenant testée dans 'preparation-transactions.tsx'
                { id: 'evt-tx-oct-1', type: 'TRANSACTION_CREEE', mutationId: ID_MUTATION_1, timestamp: '2025-01-15T10:00:01.000Z', payload: { transactionId: ID_TX_OCT_1, planDePaiementId: ID_PLAN_1, mois: '10-2025', montant: 500 } } as any,
                { id: 'evt-tx-nov-1', type: 'TRANSACTION_CREEE', mutationId: ID_MUTATION_1, timestamp: '2025-01-15T10:00:02.000Z', payload: { transactionId: ID_TX_NOV_1, planDePaiementId: ID_PLAN_1, mois: '11-2025', montant: 300 } } as any,
                { id: 'evt-tx-dec-1', type: 'TRANSACTION_CREEE', mutationId: ID_MUTATION_1, timestamp: '2025-01-15T10:00:03.000Z', payload: { transactionId: ID_TX_DEC_1, planDePaiementId: ID_PLAN_1, mois: '12-2025', montant: 300 } } as any,

                // 2. Exécution des deux premiers paiements
                { id: 'evt-exec-oct', type: 'TRANSACTION_EFFECTUEE', mutationId: ID_MUTATION_1, timestamp: '2025-10-20T10:00:00.000Z', payload: { transactionId: ID_TX_OCT_1 } } as TransactionEffectueeEvent,
                { id: 'evt-exec-nov', type: 'TRANSACTION_EFFECTUEE', mutationId: ID_MUTATION_1, timestamp: '2025-11-20T10:00:00.000Z', payload: { transactionId: ID_TX_NOV_1 } } as TransactionEffectueeEvent,
                 // On ajoute la DECISION_VALIDEE qui correspond au plan 2
                 {
                    id: 'dec-2-id',
                    type: 'DECISION_VALIDEE',
                    mutationId: ID_MUTATION_2,
                    decisionId: 'dec-2',
                    ressourceVersionId: 'v-reconcile',
                    planDePaiementId: ID_PLAN_1, // Se base sur l'ancien plan
                    timestamp: '2025-12-01T09:00:00.000Z',
                    payload: {
                        mutationType: 'DROITS',
                        detailCalcul: [
                            { month: '11-2025', aPayer: 400, calcul: 400, paiementsEffectues: 0 },
                            { month: '12-2025', aPayer: 200, calcul: 200, paiementsEffectues: 0 },
                        ]
                    }
                } as any,
            ];
            return { eventStream: events };
        }}
        when={(initialState) => {
            // WHEN: Un nouveau plan de paiement est validé pour la même période (ou une partie)
             const nouveauPlanEvent: PlanDePaiementValideEvent = {
                id: 'evt-plan-2',
                type: 'PLAN_DE_PAIEMENT_VALIDE',
                mutationId: ID_MUTATION_2,
                timestamp: '2025-12-01T10:00:00.000Z',
                payload: {
                    planDePaiementId: ID_PLAN_2,
                    decisionId: 'dec-2',
                    detailCalcul: [
                         { month: '11-2025', aPayer: 400 },
                         { month: '12-2025', aPayer: 200 },
                    ],
                },
            };
            
            // L'appel au reducer avec REPLAY déclenchera le process manager automatiquement
            // Il verra le 'PLAN_DE_PAIEMENT_VALIDE' et appellera 'preparerTransactionsCommandHandler'
            return cqrsReducer(initialState, { type: 'REPLAY', eventStream: [nouveauPlanEvent, ...initialState.eventStream] });
        }}
        then={(state) => {
            // THEN: nous vérifions l'état final de la décision
            const decisions = queryDecisionsAPrendre(state);
            const decisionFinale = decisions.find(d => d.mutationId === ID_MUTATION_2);

            const checkNovembre = decisionFinale?.planDeCalcul?.detail.find(d => d.month === '11-2025');
            const checkDecembre = decisionFinale?.planDeCalcul?.detail.find(d => d.month === '12-2025');

            const passNov = checkNovembre?.aPayer === 100; // 400 (nouveau) - 300 (payé) = 100
            const passDec = checkDecembre?.aPayer === 200; // 200 (nouveau) - 0 (payé) = 200
            
            const pass = passNov && passDec;

            const message = pass 
                ? `Succès: La décision finale est correcte. À payer: Nov: ${checkNovembre?.aPayer} CHF, Dec: ${checkDecembre?.aPayer} CHF.`
                : `Échec: La décision finale est incorrecte. Attendu Nov: 100, Dec: 200. Reçu Nov: ${checkNovembre?.aPayer}, Dec: ${checkDecembre?.aPayer}.`;

            return { pass, message };
        }}
    />
);


export const BDDTestReconciliationWrapper: React.FC = () => {
    return <TestReconciliationTransactions />;
}

    