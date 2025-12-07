"use client";

import React from 'react';
import type { AppState, AppEvent } from '../mutations/mutation-lifecycle/domain';
import { TestComponent } from '../mutations/bdd/test-harness';
import { cqrsReducer } from '../mutations/mutation-lifecycle/cqrs';
import type { PlanDePaiementValideEvent } from '../paiements/valider-plan-paiement/event';
import type { TransactionEffectueeEvent } from '../paiements/projection-transactions/events';

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
                
                // Le processeur automatique aurait créé ces transactions (simulé ici)
                { id: 'evt-tx-oct-1', type: 'TRANSACTION_CREEE', mutationId: ID_MUTATION_1, timestamp: '2025-01-15T10:00:01.000Z', payload: { transactionId: ID_TX_OCT_1, planDePaiementId: ID_PLAN_1, mois: '10-2025', montant: 500 } },
                { id: 'evt-tx-nov-1', type: 'TRANSACTION_CREEE', mutationId: ID_MUTATION_1, timestamp: '2025-01-15T10:00:02.000Z', payload: { transactionId: ID_TX_NOV_1, planDePaiementId: ID_PLAN_1, mois: '11-2025', montant: 300 } },
                { id: 'evt-tx-dec-1', type: 'TRANSACTION_CREEE', mutationId: ID_MUTATION_1, timestamp: '2025-01-15T10:00:03.000Z', payload: { transactionId: ID_TX_DEC_1, planDePaiementId: ID_PLAN_1, mois: '12-2025', montant: 300 } },

                // 2. Exécution des deux premiers paiements
                { id: 'evt-exec-oct', type: 'TRANSACTION_EFFECTUEE', mutationId: ID_MUTATION_1, timestamp: '2025-10-20T10:00:00.000Z', payload: { transactionId: ID_TX_OCT_1 } } as TransactionEffectueeEvent,
                { id: 'evt-exec-nov', type: 'TRANSACTION_EFFECTUEE', mutationId: ID_MUTATION_1, timestamp: '2025-11-20T10:00:00.000Z', payload: { transactionId: ID_TX_NOV_1 } } as TransactionEffectueeEvent,
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
                        { month: '11-2025', aPayer: 100 }, //  Nouveau solde pour Nov (400 total - 300 payé)
                        { month: '12-2025', aPayer: 200 }, //  Nouveau montant pour Dec
                    ],
                },
            };

            // L'appel au reducer avec REPLAY déclenchera le process manager automatiquement
            return cqrsReducer(initialState, { type: 'REPLAY', eventStream: [nouveauPlanEvent, ...initialState.eventStream] });
        }}
        then={(state) => {
            const events = state.eventStream;
            
            // THEN: nous vérifions que les bons événements de réconciliation ont été créés
            const replacedEvent = events.find(e => e.type === 'TRANSACTION_REMPLACEE' && (e.payload as any).transactionId === ID_TX_DEC_1);
            const newTxNovEvent = events.find(e => e.type === 'TRANSACTION_CREEE' && (e.payload as any).mois === '11-2025' && (e.payload as any).planDePaiementId === ID_PLAN_2);
            const newTxDecEvent = events.find(e => e.type === 'TRANSACTION_CREEE' && (e.payload as any).mois === '12-2025' && (e.payload as any).planDePaiementId === ID_PLAN_2);

            const pass = !!replacedEvent && !!newTxNovEvent && !!newTxDecEvent;

            const message = pass 
                ? `Succès: La transaction de Décembre a été remplacée et deux nouvelles transactions ont été créées pour Nov (100 CHF) et Déc (200 CHF).`
                : `Échec: La réconciliation n'a pas fonctionné comme prévu. Remplacé: ${!!replacedEvent}, Nv Tx Nov: ${!!newTxNovEvent}, Nv Tx Dec: ${!!newTxDecEvent}`;

            return { pass, message };
        }}
    />
);


export const BDDTestReconciliationWrapper: React.FC = () => {
    return <TestReconciliationTransactions />;
}
