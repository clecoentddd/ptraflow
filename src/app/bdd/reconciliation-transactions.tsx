
"use client";

import React from 'react';
import type { AppState, AppEvent } from '../mutations/mutation-lifecycle/domain';
import { TestComponent } from '../mutations/bdd/test-harness';
import { cqrsReducer } from '../mutations/mutation-lifecycle/cqrs';
import type { PlanDePaiementValideEvent } from '../paiements/valider-plan-paiement/event';
import type { TransactionEffectueeEvent } from '../paiements/projection-transactions/events';
import { queryDecisionsAPrendre } from '../mutations/projection-decision-a-prendre/projection';

// Création d'un ensemble cohérent d'IDs pour les tests
const ID_MUTATION_1 = 'mut-1-reconciliation';
const ID_PLAN_1 = 'plan-1-reconciliation';
const ID_TX_OCT_1 = 'tx-oct-1';
const ID_TX_NOV_1 = 'tx-nov-1';
const ID_TX_DEC_1 = 'tx-dec-1';

const ID_MUTATION_2 = 'mut-2-reconciliation';
const ID_PLAN_2 = 'plan-2-reconciliation';


const TestReconciliationTransactions: React.FC = () => (
    <TestComponent
        title="Test de Réconciliation - Remplacement partiel de transactions"
        description="Étant donné un plan de paiement partiellement exécuté, quand une nouvelle décision change les montants futurs, alors le système doit annuler les transactions 'à exécuter' et calculer la différence pour les mois déjà payés."
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
                { id: 'evt-tx-oct-1', type: 'TRANSACTION_CREEE', mutationId: ID_MUTATION_1, timestamp: '2025-01-15T10:00:01.000Z', payload: { transactionId: ID_TX_OCT_1, planDePaiementId: ID_PLAN_1, mois: '10-2025', montant: 500 } } as any,
                { id: 'evt-tx-nov-1', type: 'TRANSACTION_CREEE', mutationId: ID_MUTATION_1, timestamp: '2025-01-15T10:00:02.000Z', payload: { transactionId: ID_TX_NOV_1, planDePaiementId: ID_PLAN_1, mois: '11-2025', montant: 300 } } as any,
                { id: 'evt-tx-dec-1', type: 'TRANSACTION_CREEE', mutationId: ID_MUTATION_1, timestamp: '2025-01-15T10:00:03.000Z', payload: { transactionId: ID_TX_DEC_1, planDePaiementId: ID_PLAN_1, mois: '12-2025', montant: 300 } } as any,

                // 2. Exécution du premier paiement
                { id: 'evt-exec-oct', type: 'TRANSACTION_EFFECTUEE', mutationId: ID_MUTATION_1, timestamp: '2025-10-20T10:00:00.000Z', payload: { transactionId: ID_TX_OCT_1 } } as TransactionEffectueeEvent,
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
            return cqrsReducer(initialState, { type: 'REPLAY', eventStream: [nouveauPlanEvent, ...initialState.eventStream] });
        }}
        then={(state) => {
            // THEN: nous vérifions l'état final de la décision
            const decisions = queryDecisionsAPrendre(state);
            const decisionFinale = decisions.find(d => d.mutationId === ID_MUTATION_2);

            const checkOctobre = decisionFinale?.planDeCalcul?.detail.find(d => d.month === '10-2025');
            const checkNovembre = decisionFinale?.planDeCalcul?.detail.find(d => d.month === '11-2025');
            const checkDecembre = decisionFinale?.planDeCalcul?.detail.find(d => d.month === '12-2025');

            const passOct = checkOctobre?.aPayer === -500; // 0 (nouveau calcul) - 500 (payé) = -500
            const passNov = checkNovembre?.aPayer === 400; // 400 (nouveau) - 0 (rien payé sur le plan 1 pour Nov) = 400
            const passDec = checkDecembre?.aPayer === 200; // 200 (nouveau) - 0 (rien payé sur le plan 1 pour Dec) = 200
            
            const pass = passOct && passNov && passDec;

            const message = pass 
                ? `Succès: La décision finale est correcte. À payer: Oct: ${checkOctobre?.aPayer} CHF, Nov: ${checkNovembre?.aPayer} CHF, Dec: ${checkDecembre?.aPayer} CHF.`
                : `Échec: Décision finale incorrecte. Attendu Oct: -500, Nov: 400, Dec: 200. Reçu Oct: ${checkOctobre?.aPayer}, Nov: ${checkNovembre?.aPayer}, Dec: ${checkDecembre?.aPayer}.`;

            return { pass, message };
        }}
    />
);


const TestReconciliationAvecPaiementsEffectues: React.FC = () => (
    <TestComponent
        title="Test de Réconciliation - Scénario complexe avec paiement effectué"
        description="Étant donné un paiement effectué (Oct: 500) et des paiements futurs prévus (Nov: 300, Dec: 300), quand un nouveau plan de calcul redéfinit les montants (Nov: 800, Dec: 800), alors la décision finale doit refléter un crédit pour le paiement d'Octobre et les nouveaux montants pour Novembre et Décembre."
        given={() => {
            const events: AppEvent[] = [
                { id: 'evt-plan-1', type: 'PLAN_DE_PAIEMENT_VALIDE', mutationId: 'mut-1', timestamp: '2025-01-15T10:00:00.000Z', payload: { planDePaiementId: 'plan-1', decisionId: 'dec-1', detailCalcul: [ { month: '10-2025', aPayer: 500 }, { month: '11-2025', aPayer: 300 }, { month: '12-2025', aPayer: 300 } ] } } as any,
                { id: 'evt-tx-create-oct', type: 'TRANSACTION_CREEE', mutationId: 'mut-1', timestamp: '2025-01-15T10:01:00.000Z', payload: { transactionId: 'tx-oct', planDePaiementId: 'plan-1', mois: '10-2025', montant: 500 } } as any,
                { id: 'evt-tx-create-nov', type: 'TRANSACTION_CREEE', mutationId: 'mut-1', timestamp: '2025-01-15T10:01:01.000Z', payload: { transactionId: 'tx-nov', planDePaiementId: 'plan-1', mois: '11-2025', montant: 300 } } as any,
                { id: 'evt-tx-create-dec', type: 'TRANSACTION_CREEE', mutationId: 'mut-1', timestamp: '2025-01-15T10:01:02.000Z', payload: { transactionId: 'tx-dec', planDePaiementId: 'plan-1', mois: '12-2025', montant: 300 } } as any,
                { id: 'evt-tx-exec-oct', type: 'TRANSACTION_EFFECTUEE', mutationId: 'mut-1', timestamp: '2025-10-20T10:00:00.000Z', payload: { transactionId: 'tx-oct' } } as any,
                {
                    id: 'dec-2-id', type: 'DECISION_VALIDEE', mutationId: 'mut-2', decisionId: 'dec-2', ressourceVersionId: 'v2', planDePaiementId: 'plan-1', timestamp: '2025-11-01T09:00:00.000Z',
                    payload: { mutationType: 'DROITS', detailCalcul: [ { month: '11-2025', aPayer: 800, calcul: 800, paiementsEffectues: 0 }, { month: '12-2025', aPayer: 800, calcul: 800, paiementsEffectues: 0 } ] }
                } as any,
            ];
            return { eventStream: events };
        }}
        when={(initialState) => {
            const nouveauPlanEvent: PlanDePaiementValideEvent = {
                id: 'evt-plan-2', type: 'PLAN_DE_PAIEMENT_VALIDE', mutationId: 'mut-2', timestamp: '2025-11-01T10:00:00.000Z',
                payload: { planDePaiementId: 'plan-2', decisionId: 'dec-2', detailCalcul: [ { month: '11-2025', aPayer: 800 }, { month: '12-2025', aPayer: 800 } ] }
            };
            return cqrsReducer(initialState, { type: 'REPLAY', eventStream: [nouveauPlanEvent, ...initialState.eventStream] });
        }}
        then={(state) => {
            const decisionFinale = queryDecisionsAPrendre(state).find(d => d.mutationId === 'mut-2');
            const checkOctobre = decisionFinale?.planDeCalcul?.detail.find(d => d.month === '10-2025');
            const checkNovembre = decisionFinale?.planDeCalcul?.detail.find(d => d.month === '11-2025');
            const checkDecembre = decisionFinale?.planDeCalcul?.detail.find(d => d.month === '12-2025');

            const passOct = checkOctobre?.aPayer === -500;
            const passNov = checkNovembre?.aPayer === 800;
            const passDec = checkDecembre?.aPayer === 800;

            const pass = passOct && passNov && passDec;

            const message = pass
                ? `Succès: La décision finale est correcte. À payer: Oct: ${checkOctobre?.aPayer}, Nov: ${checkNovembre?.aPayer}, Dec: ${checkDecembre?.aPayer}.`
                : `Échec: Décision finale incorrecte. Attendu Oct: -500, Nov: 800, Dec: 800. Reçu Oct: ${checkOctobre?.aPayer}, Nov: ${checkNovembre?.aPayer}, Dec: ${checkDecembre?.aPayer}.`;

            return { pass, message };
        }}
    />
);


export const BDDTestReconciliationWrapper: React.FC = () => {
    return (
        <div className="space-y-4">
            <TestReconciliationTransactions />
            <TestReconciliationAvecPaiementsEffectues />
        </div>
    );
}
