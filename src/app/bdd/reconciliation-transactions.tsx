
"use client";

import React from 'react';
import type { AppState, AppEvent } from '../mutations/mutation-lifecycle/domain';
import { TestComponent } from '../mutations/bdd/test-harness';
import { cqrsReducer } from '../mutations/mutation-lifecycle/cqrs';
import { queryDecisionsAPrendre } from '../mutations/projection-decision-a-prendre/projection';

export const BDDTestReconciliationSimple: React.FC = () => (
    <TestComponent
        title="Test de Réconciliation (Cas 2: Remplacement)"
        description="Etant donné qu'un paiement pour Décembre 2025 de 300 CHF est 'A Exécuter', et qu'un nouveau calcul détermine que Novembre 2025 doit être de 100 CHF et Décembre 2025 de 200 CHF, quand le nouveau plan est validé, alors la projection de la décision doit refléter les nouveaux montants dus."
        given={() => {
            const events: AppEvent[] = [
                // --- First Plan (Partially Executed) ---
                { id: "evt-plan1", type: "PLAN_DE_PAIEMENT_VALIDE", mutationId: "mut-1", timestamp: "2025-09-01T10:00:00.000Z", payload: { planDePaiementId: "plan-1", decisionId: "dec-1", detailCalcul: [] } },
                { id: "tx-creee-oct", type: "TRANSACTION_CREEE", mutationId: "mut-1", timestamp: "2025-09-01T10:01:00.000Z", payload: { transactionId: "tx-oct", planDePaiementId: "plan-1", mois: "10-2025", montant: 500 } },
                { id: "tx-creee-nov", type: "TRANSACTION_CREEE", mutationId: "mut-1", timestamp: "2025-09-01T10:02:00.000Z", payload: { transactionId: "tx-nov", planDePaiementId: "plan-1", mois: "11-2025", montant: 300 } },
                { id: "tx-creee-dec", type: "TRANSACTION_CREEE", mutationId: "mut-1", timestamp: "2025-09-01T10:03:00.000Z", payload: { transactionId: "tx-dec", planDePaiementId: "plan-1", mois: "12-2025", montant: 300 } },
                { id: "tx-exec-oct", type: "TRANSACTION_EFFECTUEE", mutationId: "mut-1", timestamp: "2025-10-05T10:00:00.000Z", payload: { transactionId: "tx-oct" } },
                
                // --- New Mutation (In Progress) ---
                { id: "evt-mut2-created", type: "DROITS_MUTATION_CREATED", mutationId: "mut-2", timestamp: "2025-11-01T09:00:00.000Z", payload: { mutationType: 'DROITS'} },
                { id: "evt-mut2-suspended", type: "PAIEMENTS_SUSPENDUS", mutationId: "mut-2", timestamp: "2025-11-01T09:01:00.000Z", payload: { userEmail: 'test'} },
                 { id: "evt-mut2-calcul", type: "PLAN_CALCUL_EFFECTUE", mutationId: "mut-2", timestamp: "2025-11-01T09:02:00.000Z", ressourceVersionId: 'v2', payload: { calculId: 'calcul-2', detail: [
                     { month: '11-2025', revenus: 2000, depenses: 0, resultat: 2000, calcul: 200 },
                     { month: '12-2025', revenus: 4000, depenses: 0, resultat: 4000, calcul: 400 }
                 ]} },
                 { id: "evt-mut2-decision", type: "DECISION_VALIDEE", mutationId: "mut-2", timestamp: "2025-11-01T09:03:00.000Z", decisionId: 'dec-2', ressourceVersionId: 'v2', planDePaiementId: 'plan-2', payload: { mutationType: 'DROITS', detailCalcul: [
                    { month: '11-2025', calcul: 200, paiementsEffectues: 300, aPayer: -100 },
                    { month: '12-2025', calcul: 400, paiementsEffectues: 0, aPayer: 400 }
                 ]} }
            ];
            return { eventStream: events };
        }}
        when={(initialState) => {
            // WHEN: The new payment plan is validated, triggering the reconciliation
            const event: AppEvent = {
                 id: "evt-plan2", type: "PLAN_DE_PAIEMENT_VALIDE", mutationId: "mut-2", timestamp: "2025-11-01T09:04:00.000Z", payload: { planDePaiementId: "plan-2", decisionId: "dec-2", detailCalcul: [
                     { month: '10-2025', aPayer: -500 },
                     { month: '11-2025', aPayer: -100 },
                     { month: '12-2025', aPayer: 100 }
                 ] } 
            };
            // We replay all events including the new one to get the final state.
            return cqrsReducer(initialState, { type: 'REPLAY', eventStream: [...initialState.eventStream, event] });
        }}
        then={(state) => {
            // THEN: The final decision projection should reflect the reconciled amounts
            const decisions = queryDecisionsAPrendre(state);
            const decision = decisions.find(d => d.mutationId === 'mut-2');
            
            const oct = decision?.planDeCalcul?.detail.find(d => d.month === '10-2025');
            const nov = decision?.planDeCalcul?.detail.find(d => d.month === '11-2025');
            const dec = decision?.planDeCalcul?.detail.find(d => d.month === '12-2025');

            const pass = oct?.aPayer === -500 && nov?.aPayer === -100 && dec?.aPayer === 100;
            
            return {
                pass,
                message: pass
                    ? `Succès: La décision a été correctement réconciliée (Oct: ${oct?.aPayer}, Nov: ${nov?.aPayer}, Dec: ${dec?.aPayer}).`
                    : `Échec: La réconciliation est incorrecte. Reçu: (Oct: ${oct?.aPayer}, Nov: ${nov?.aPayer}, Dec: ${dec?.aPayer}). Attendu: -500, -100, 100.`
            };
        }}
    />
);

const TestReconciliationAvecPaiementsEffectues: React.FC = () => (
    <TestComponent
        title="Test de Réconciliation avec Paiement Antérieur Exécuté"
        description="Etant donné qu'un paiement pour Oct-25 de 500 CHF a été exécuté, et qu'un nouveau calcul pour Nov-25 (800 CHF) et Dec-25 (800 CHF) est effectué, alors la décision à prendre doit calculer un remboursement pour Octobre et les nouveaux montants pour Nov et Dec."
        given={() => {
            const events: AppEvent[] = [
                // --- First Plan (Executed) ---
                { id: "evt-plan1-reco", type: "PLAN_DE_PAIEMENT_VALIDE", mutationId: "mut-reco-1", timestamp: "2025-09-01T10:00:00.000Z", payload: { planDePaiementId: "plan-reco-1", decisionId: "dec-reco-1", detailCalcul: [] } },
                { id: "tx-creee-oct-reco", type: "TRANSACTION_CREEE", mutationId: "mut-reco-1", timestamp: "2025-09-01T10:01:00.000Z", payload: { transactionId: "tx-oct-reco", planDePaiementId: "plan-reco-1", mois: "10-2025", montant: 500 } },
                { id: "tx-creee-nov-reco", type: "TRANSACTION_CREEE", mutationId: "mut-reco-1", timestamp: "2025-09-01T10:02:00.000Z", payload: { transactionId: "tx-nov-reco", planDePaiementId: "plan-reco-1", mois: "11-2025", montant: 300 } },
                { id: "tx-creee-dec-reco", type: "TRANSACTION_CREEE", mutationId: "mut-reco-1", timestamp: "2025-09-01T10:03:00.000Z", payload: { transactionId: "tx-dec-reco", planDePaiementId: "plan-reco-1", mois: "12-2025", montant: 300 } },
                { id: "tx-exec-oct-reco", type: "TRANSACTION_EFFECTUEE", mutationId: "mut-reco-1", timestamp: "2025-10-05T10:00:00.000Z", payload: { transactionId: "tx-oct-reco" } },

                // --- New Mutation (In Progress) ---
                { id: "evt-mut-reco-2-created", type: "DROITS_MUTATION_CREATED", mutationId: "mut-reco-2", timestamp: "2025-11-01T09:00:00.000Z", payload: { mutationType: 'DROITS'} },
            ];
            return { eventStream: events };
        }}
        when={(initialState) => {
            // WHEN: A new calculation is performed for Nov and Dec
            const newCalculationEvent: AppEvent = {
                id: "evt-mut-reco-2-calcul",
                type: "PLAN_CALCUL_EFFECTUE",
                mutationId: "mut-reco-2",
                timestamp: "2025-11-01T09:02:00.000Z",
                ressourceVersionId: 'v-reco-2',
                payload: {
                    calculId: 'calcul-reco-2',
                    detail: [
                        { month: '11-2025', revenus: 8000, depenses: 0, resultat: 8000, calcul: 800 },
                        { month: '12-2025', revenus: 8000, depenses: 0, resultat: 8000, calcul: 800 }
                    ]
                }
            };
            // Replay the state with this new event to trigger the decision projection
            return cqrsReducer(initialState, { type: 'REPLAY', eventStream: [...initialState.eventStream, newCalculationEvent] });
        }}
        then={(finalState) => {
            // THEN: The decision projection should show the reconciled amounts
            const decisions = queryDecisionsAPrendre(finalState);
            const decision = decisions.find(d => d.mutationId === 'mut-reco-2');

            const oct = decision?.planDeCalcul?.detail.find(d => d.month === '10-2025');
            const nov = decision?.planDeCalcul?.detail.find(d => d.month === '11-2025');
            const dec = decision?.planDeCalcul?.detail.find(d => d.month === '12-2025');

            const pass = oct?.aPayer === -500 && nov?.aPayer === 800 && dec?.aPayer === 800;

            return {
                pass,
                message: pass
                    ? `Succès: La décision a été correctement réconciliée (Oct: ${oct?.aPayer}, Nov: ${nov?.aPayer}, Dec: ${dec?.aPayer}).`
                    : `Échec: La réconciliation est incorrecte. Reçu: (Oct: ${oct?.aPayer}, Nov: ${nov?.aPayer}, Dec: ${dec?.aPayer}). Attendu: -500, 800, 800.`
            };
        }}
    />
);


export const BDDTestReconciliationWrapper: React.FC = () => (
    <div className='space-y-4'>
        <h2 className="text-2xl font-bold mt-8 border-t pt-6">Tests BDD - Réconciliation des Transactions</h2>
        <BDDTestReconciliationSimple />
        <TestReconciliationAvecPaiementsEffectues />
    </div>
);

    