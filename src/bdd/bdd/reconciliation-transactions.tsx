
"use client";

import React from 'react';
import type { AppState, AppEvent } from '../mutations/mutation-lifecycle/domain';
import { TestComponent } from './test-harness';
import { EventBus, rehydrateStateForTesting } from '../mutations/mutation-lifecycle/event-bus';
import { queryDecisionsAPrendre } from '../mutations/projection-decision-a-prendre/projection';

export const BDDTestReconciliationSimple: React.FC = () => (
    <TestComponent
        title="Test de Réconciliation (Cas 2: Remplacement)"
        description="Etant donné qu'un paiement pour Décembre 2025 de 300 CHF est 'A Exécuter', et qu'un nouveau calcul détermine que Novembre 2025 doit être de 100 CHF et Décembre 2025 de 200 CHF, quand le nouveau plan est validé, alors la projection de la décision doit refléter les nouveaux montants dus."
        given={() => {
            const events: AppEvent[] = [
                // --- First Plan (Partially Executed) ---
                { id: "plan-1", type: "PLAN_DE_PAIEMENT_VALIDE", mutationId: "mut-1", timestamp: "2025-09-01T10:00:00.000Z", payload: { decisionId: "dec-1", detailCalcul: [] } } as any,
                { id: "tx-creee-oct", type: "TRANSACTION_CREEE", mutationId: "mut-1", timestamp: "2025-09-01T10:01:00.000Z", payload: { transactionId: "tx-oct", planDePaiementId: "plan-1", mois: "10-2025", montant: 500 } } as any,
                { id: "tx-creee-nov", type: "TRANSACTION_CREEE", mutationId: "mut-1", timestamp: "2025-09-01T10:02:00.000Z", payload: { transactionId: "tx-nov", planDePaiementId: "plan-1", mois: "11-2025", montant: 300 } } as any,
                { id: "tx-creee-dec", type: "TRANSACTION_CREEE", mutationId: "mut-1", timestamp: "2025-09-01T10:03:00.000Z", payload: { transactionId: "tx-dec", planDePaiementId: "plan-1", mois: "12-2025", montant: 300 } } as any,
                { id: "tx-exec-oct", type: "TRANSACTION_EFFECTUEE", mutationId: "mut-1", timestamp: "2025-10-05T10:00:00.000Z", payload: { transactionId: "tx-oct" } } as any,
                
                // --- New Mutation (In Progress) ---
                { id: "evt-mut2-created", type: "DROITS_MUTATION_CREATED", mutationId: "mut-2", timestamp: "2025-11-01T09:00:00.000Z", payload: { mutationType: 'DROITS'} } as any,
                { id: "evt-mut2-suspended", type: "PAIEMENTS_SUSPENDUS", mutationId: "mut-2", timestamp: "2025-11-01T09:01:00.000Z", payload: { userEmail: 'test'} } as any,
                 { id: "evt-mut2-calcul", type: "PLAN_CALCUL_EFFECTUE", mutationId: "mut-2", timestamp: "2025-11-01T09:02:00.000Z", ressourceVersionId: 'v2', payload: { calculId: 'calcul-2', detail: [
                     { month: '11-2025', revenus: 2000, depenses: 0, resultat: 2000, calcul: 200 },
                     { month: '12-2025', revenus: 4000, depenses: 0, resultat: 4000, calcul: 400 }
                 ]} } as any,
                 { id: "evt-mut2-decision", type: "DECISION_VALIDEE", mutationId: "mut-2", timestamp: "2025-11-01T09:03:00.000Z", payload: { decisionId: 'dec-2', ressourceVersionId: 'v2' } } as any
            ];
            return { eventStream: events };
        }}
        when={(initialState) => {
            // WHEN: The new payment plan is validated, triggering the reconciliation
            const event: AppEvent = {
                 id: "plan-2", type: "PLAN_DE_PAIEMENT_VALIDE", mutationId: "mut-2", timestamp: "2025-11-01T09:04:00.000Z", payload: { decisionId: "dec-2", detailCalcul: [
                     { month: '10-2025', aPayer: -500 },
                     { month: '11-2025', aPayer: -100 },
                     { month: '12-2025', aPayer: 100 }
                 ] } 
            } as any;
            rehydrateStateForTesting([...initialState.eventStream, event]);
            return EventBus.getState();
        }}
        then={(state) => {
            // THEN: The final decision projection should reflect the reconciled amounts
            const decisions = queryDecisionsAPrendre(state);
            // Since the decision for mut-2 is now validated and followed by a payment plan,
            // it should no longer be in the "decisions to make" projection.
            const decision = decisions.find(d => d.mutationId === 'mut-2');
            const pass = !decision;
            
            return {
                pass,
                message: pass
                    ? `Succès: La décision pour mut-2 a été correctement traitée et n'est plus "à prendre".`
                    : `Échec: La décision pour mut-2 est toujours présente dans la liste des décisions à prendre.`
            };
        }}
    />
);

const TestReconciliationAvecPaiementsEffectues: React.FC = () => (
    <TestComponent
        title="Test de Réconciliation avec Paiement Antérieur Exécuté"
        description="Etant donné qu'un paiement pour Oct-25 de 500 CHF a été exécuté, et qu'un nouveau calcul pour Nov-25 (800 CHF) et Dec-25 (800 CHF) est effectué, alors la projection de la décision doit calculer un remboursement pour Octobre et les nouveaux montants pour Nov et Dec."
        given={() => {
            const events: AppEvent[] = [
                // --- First Plan (Executed) ---
                { id: "plan-reco-1", type: "PLAN_DE_PAIEMENT_VALIDE", mutationId: "mut-reco-1", timestamp: "2025-09-01T10:00:00.000Z", payload: { decisionId: "dec-reco-1", detailCalcul: [] } } as any,
                { id: "tx-creee-oct-reco", type: "TRANSACTION_CREEE", mutationId: "mut-reco-1", timestamp: "2025-09-01T10:01:00.000Z", payload: { transactionId: "tx-oct-reco", planDePaiementId: "plan-reco-1", mois: "10-2025", montant: 500 } } as any,
                { id: "tx-creee-nov-reco", type: "TRANSACTION_CREEE", mutationId: "mut-reco-1", timestamp: "2025-09-01T10:02:00.000Z", payload: { transactionId: "tx-nov-reco", planDePaiementId: "plan-reco-1", mois: "11-2025", montant: 300 } } as any,
                { id: "tx-creee-dec-reco", type: "TRANSACTION_CREEE", mutationId: "mut-reco-1", timestamp: "2025-09-01T10:03:00.000Z", payload: { transactionId: "tx-dec-reco", planDePaiementId: "plan-reco-1", mois: "12-2025", montant: 300 } } as any,
                { id: "tx-exec-oct-reco", type: "TRANSACTION_EFFECTUEE", mutationId: "mut-reco-1", timestamp: "2025-10-05T10:00:00.000Z", payload: { transactionId: "tx-oct-reco" } } as any,

                // --- New Mutation (In Progress) ---
                { id: "evt-mut-reco-2-created", type: "DROITS_MUTATION_CREATED", mutationId: "mut-reco-2", timestamp: "2025-11-01T09:00:00.000Z", payload: { mutationType: 'DROITS'} } as any,
                { id: "evt-mut-reco-2-suspended", type: "PAIEMENTS_SUSPENDUS", mutationId: "mut-reco-2", timestamp: "2025-11-01T09:01:00.000Z", payload: { userEmail: 'test'} } as any,
            ];
            return { eventStream: events };
        }}
        when={(initialState) => {
            rehydrateStateForTesting(initialState.eventStream);
            // WHEN: A new calculation is performed for Nov and Dec, which triggers decision preparation
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
            } as any;
            // We manually append the event and run the process managers by calling rehydrate.
            rehydrateStateForTesting([...initialState.eventStream, newCalculationEvent]);
            return EventBus.getState();
        }}
        then={(finalState) => {
            // THEN: The decision projection should show the reconciled amounts
            const decisions = queryDecisionsAPrendre(finalState);
            const decision = decisions.find(d => d.mutationId === 'mut-reco-2');

            const oct = decision?.detail.find(d => d.month === '10-2025');
            const nov = decision?.detail.find(d => d.month === '11-2025');
            const dec = decision?.detail.find(d => d.month === '12-2025');

            const pass = oct?.aPayer === -500 && nov?.aPayer === 800 && dec?.aPayer === 800;

            return {
                pass,
                message: pass
                    ? `Succès: La projection de décision a été correctement réconciliée (Oct: ${oct?.aPayer}, Nov: ${nov?.aPayer}, Dec: ${dec?.aPayer}).`
                    : `Échec: La réconciliation de la projection est incorrecte. Reçu: (Oct: ${oct?.aPayer}, Nov: ${nov?.aPayer}, Dec: ${dec?.aPayer}). Attendu: -500, 800, 800.`
            };
        }}
    />
);

const TestValidationDecisionAvecRemboursement: React.FC = () => (
    <TestComponent
        title="Test Validation Décision avec Montants Négatifs"
        description="Etant donné une décision à prendre avec des montants à payer négatifs (remboursements), quand l'utilisateur valide cette décision, alors l'événement DecisionValideeEvent doit conserver ces montants négatifs."
        given={() => {
            const events: AppEvent[] = [
                // --- Setup to create a state where a reimbursement is needed ---
                // Payment made in October
                { id: "plan-remboursement", type: "PLAN_DE_PAIEMENT_VALIDE", mutationId: "mut-remboursement-1", timestamp: "2025-09-01T10:00:00.000Z", payload: { decisionId: "dec-remboursement", detailCalcul: [] } } as any,
                { id: "tx-creee-oct-remboursement", type: "TRANSACTION_CREEE", mutationId: "mut-remboursement-1", timestamp: "2025-09-01T10:01:00.000Z", payload: { transactionId: "tx-oct-remboursement", planDePaiementId: "plan-remboursement", mois: "10-2025", montant: 50 } } as any,
                { id: "tx-exec-oct-remboursement", type: "TRANSACTION_EFFECTUEE", mutationId: "mut-remboursement-1", timestamp: "2025-10-05T10:00:00.000Z", payload: { transactionId: "tx-oct-remboursement" } } as any,
                
                // New mutation that will lead to a new calculation
                { id: "evt-mut-remboursement-2-created", type: "DROITS_MUTATION_CREATED", mutationId: "mut-remboursement-2", timestamp: "2025-11-01T09:00:00.000Z", payload: { mutationType: 'DROITS'} } as any,
                { id: "evt-mut-remboursement-2-suspended", type: "PAIEMENTS_SUSPENDUS", mutationId: "mut-remboursement-2", timestamp: "2025-11-01T09:01:00.000Z", payload: { userEmail: 'test'} } as any,
                { id: "evt-mut-remboursement-2-calcul", type: "PLAN_CALCUL_EFFECTUE", mutationId: "mut-remboursement-2", timestamp: "2025-11-01T09:02:00.000Z", ressourceVersionId: 'v-remboursement-2', payload: { calculId: 'calcul-remboursement-2', detail: [
                    { month: '11-2025', revenus: 1000, depenses: 0, resultat: 1000, calcul: 100 },
                    { month: '12-2025', revenus: 1000, depenses: 0, resultat: 1000, calcul: 100 }
                ]} } as any,
            ];
            // After these events, queryDecisionsAPrendre will show { aPayer: -50 } for Oct-2025.
            rehydrateStateForTesting(events);
            return EventBus.getState();
        }}
        when={(initialState) => {
            // WHEN: The user validates the decision for the second mutation.
            const decision = queryDecisionsAPrendre(initialState).find(d => d.mutationId === 'mut-remboursement-2');
            if (!decision) return initialState; // Should not happen in this test

            dispatchCommand({
                type: 'VALIDER_DECISION',
                payload: {
                    mutationId: 'mut-remboursement-2',
                    decisionId: decision.decisionId
                }
            });
            return EventBus.getState();
        }}
        then={(finalState) => {
            // THEN: The newly created PlanDePaiementValideEvent should have its negative aPayer value preserved.
            const planValideEvent = finalState.eventStream.find(e => e.type === 'PLAN_DE_PAIEMENT_VALIDE' && e.mutationId === 'mut-remboursement-2') as any | undefined;

            if (!planValideEvent) {
                return { pass: false, message: "Échec: L'événement PLAN_DE_PAIEMENT_VALIDE n'a pas été trouvé." };
            }
            
            const octDetail = planValideEvent.payload.detailCalcul.find(d => d.month === '10-2025');
            const novDetail = planValideEvent.payload.detailCalcul.find(d => d.month === '11-2025');
            
            const pass = octDetail?.aPayer === -50 && novDetail?.aPayer === 100;
            
            return {
                pass,
                message: pass
                    ? `Succès: Le montant à payer pour Octobre a été conservé à -50 dans l'événement (reçu: ${octDetail?.aPayer}).`
                    : `Échec: Le montant à payer pour Octobre aurait dû être -50. Reçu: ${octDetail?.aPayer}.`
            };
        }}
    />
);


export const BDDTestReconciliationWrapper: React.FC = () => (
    <div className='space-y-4'>
        <h2 className="text-2xl font-bold mt-8 border-t pt-6">Tests BDD - Réconciliation des Transactions</h2>
        <BDDTestReconciliationSimple />
        <TestReconciliationAvecPaiementsEffectues />
        <TestValidationDecisionAvecRemboursement />
    </div>
);
