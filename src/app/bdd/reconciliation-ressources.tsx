
"use client";

import React from 'react';
import type { AppState, AppEvent } from '../mutations/mutation-lifecycle/domain';
import { TestComponent } from '../mutations/bdd/test-harness';
import { cqrsReducer } from '../mutations/mutation-lifecycle/cqrs';
import { queryDecisionsAPrendre } from '../mutations/projection-decision-a-prendre/projection';
import type { DecisionValideeEvent } from '../mutations/valider-decision/event';

const TestReconciliationRessourcesAvecPaiementsEffectues: React.FC = () => (
    <TestComponent
        title="Test Réconciliation (Mutation Ressources) avec Paiement Antérieur Exécuté"
        description="Etant donné qu'un paiement pour Oct-25 de 500 CHF a été exécuté (suite à une mutation de droits), et qu'une nouvelle MUTATION DE RESSOURCES est créée avec un calcul pour Nov-25 (800 CHF) et Dec-25 (800 CHF), alors la projection de la décision doit calculer un remboursement pour Octobre et les nouveaux montants pour Nov et Dec."
        given={() => {
            const events: AppEvent[] = [
                // --- First Plan (Executed) from a DROITS mutation ---
                { id: "evt-plan1-reco-res", type: "PLAN_DE_PAIEMENT_VALIDE", mutationId: "mut-reco-res-1", timestamp: "2025-09-01T10:00:00.000Z", payload: { planDePaiementId: "plan-reco-res-1", decisionId: "dec-reco-res-1", detailCalcul: [] } },
                { id: "tx-creee-oct-reco-res", type: "TRANSACTION_CREEE", mutationId: "mut-reco-res-1", timestamp: "2025-09-01T10:01:00.000Z", payload: { transactionId: "tx-oct-reco-res", planDePaiementId: "plan-reco-res-1", mois: "10-2025", montant: 500 } },
                { id: "tx-creee-nov-reco-res", type: "TRANSACTION_CREEE", mutationId: "mut-reco-res-1", timestamp: "2025-09-01T10:02:00.000Z", payload: { transactionId: "tx-nov-reco-res", planDePaiementId: "plan-reco-res-1", mois: "11-2025", montant: 300 } },
                { id: "tx-exec-oct-reco-res", type: "TRANSACTION_EFFECTUEE", mutationId: "mut-reco-res-1", timestamp: "2025-10-05T10:00:00.000Z", payload: { transactionId: "tx-oct-reco-res" } },

                // --- New RESSOURCES Mutation (In Progress) ---
                { id: "evt-mut-reco-res-2-created", type: "RESSOURCES_MUTATION_CREATED", mutationId: "mut-reco-res-2", timestamp: "2025-11-01T09:00:00.000Z", payload: { mutationType: 'RESSOURCES'} },
                { id: "evt-mut-reco-res-2-suspended", type: "PAIEMENTS_SUSPENDUS", mutationId: "mut-reco-res-2", timestamp: "2025-11-01T09:01:00.000Z", payload: { userEmail: 'test'} },
            ];
            return { eventStream: events };
        }}
        when={(initialState) => {
            // WHEN: A new calculation is performed for Nov and Dec
            const newCalculationEvent: AppEvent = {
                id: "evt-mut-reco-res-2-calcul",
                type: "PLAN_CALCUL_EFFECTUE",
                mutationId: "mut-reco-res-2",
                timestamp: "2025-11-01T09:02:00.000Z",
                ressourceVersionId: 'v-reco-res-2',
                payload: {
                    calculId: 'calcul-reco-res-2',
                    detail: [
                        { month: '11-2025', revenus: 8000, depenses: 0, resultat: 8000, calcul: 800 },
                        { month: '12-2025', revenus: 8000, depenses: 0, resultat: 8000, calcul: 800 }
                    ]
                }
            };
            return cqrsReducer(initialState, { type: 'REPLAY', eventStream: [...initialState.eventStream, newCalculationEvent] });
        }}
        then={(finalState) => {
            const decisions = queryDecisionsAPrendre(finalState);
            const decision = decisions.find(d => d.mutationId === 'mut-reco-res-2');

            const oct = decision?.planDeCalcul?.detail.find(d => d.month === '10-2025');
            const nov = decision?.planDeCalcul?.detail.find(d => d.month === '11-2025');
            const dec = decision?.planDeCalcul?.detail.find(d => d.month === '12-2025');

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

const TestValidationDecisionRessourcesAvecRemboursement: React.FC = () => (
    <TestComponent
        title="Test Validation Décision (Mutation Ressources) avec Montants Négatifs"
        description="Etant donné une décision à prendre (issue d'une mutation de RESSOURCES) avec un remboursement (-50 CHF), quand l'utilisateur valide cette décision, alors l'événement DecisionValideeEvent doit conserver ce montant négatif."
        given={() => {
            const events: AppEvent[] = [
                // --- Setup from a DROITS mutation to create a state where a reimbursement is needed ---
                { id: "evt-plan-remboursement-res", type: "PLAN_DE_PAIEMENT_VALIDE", mutationId: "mut-remboursement-res-1", timestamp: "2025-09-01T10:00:00.000Z", payload: { planDePaiementId: "plan-remboursement-res", decisionId: "dec-remboursement-res", detailCalcul: [] } },
                { id: "tx-creee-oct-remboursement-res", type: "TRANSACTION_CREEE", mutationId: "mut-remboursement-res-1", timestamp: "2025-09-01T10:01:00.000Z", payload: { transactionId: "tx-oct-remboursement-res", planDePaiementId: "plan-remboursement-res", mois: "10-2025", montant: 50 } },
                { id: "tx-exec-oct-remboursement-res", type: "TRANSACTION_EFFECTUEE", mutationId: "mut-remboursement-res-1", timestamp: "2025-10-05T10:00:00.000Z", payload: { transactionId: "tx-oct-remboursement-res" } },
                
                // --- New RESSOURCES mutation that will lead to a new calculation ---
                { id: "evt-mut-remboursement-res-2-created", type: "RESSOURCES_MUTATION_CREATED", mutationId: "mut-remboursement-res-2", timestamp: "2025-11-01T09:00:00.000Z", payload: { mutationType: 'RESSOURCES'} },
                { id: "evt-mut-remboursement-res-2-suspended", type: "PAIEMENTS_SUSPENDUS", mutationId: "mut-remboursement-res-2", timestamp: "2025-11-01T09:01:00.000Z", payload: { userEmail: 'test'} },
                { id: "evt-mut-remboursement-res-2-calcul", type: "PLAN_CALCUL_EFFECTUE", mutationId: "mut-remboursement-res-2", timestamp: "2025-11-01T09:02:00.000Z", ressourceVersionId: 'v-remboursement-res-2', payload: { calculId: 'calcul-remboursement-res-2', detail: [
                    { month: '11-2025', revenus: 1000, depenses: 0, resultat: 1000, calcul: 100 },
                    { month: '12-2025', revenus: 1000, depenses: 0, resultat: 1000, calcul: 100 }
                ]} },
            ];
            // After these events, queryDecisionsAPrendre will show { aPayer: -50 } for Oct-2025.
            const initialState = cqrsReducer({ eventStream: [] } as any, { type: 'REPLAY', eventStream: events });
            return initialState;
        }}
        when={(initialState) => {
            const decision = queryDecisionsAPrendre(initialState).find(d => d.mutationId === 'mut-remboursement-res-2');
            if (!decision) return initialState;

            return cqrsReducer(initialState, {
                type: 'VALIDER_DECISION',
                payload: {
                    mutationId: 'mut-remboursement-res-2',
                    decisionId: decision.decisionId
                }
            });
        }}
        then={(finalState) => {
            const decisionValideeEvent = finalState.eventStream.find(e => e.type === 'DECISION_VALIDEE' && e.mutationId === 'mut-remboursement-res-2') as DecisionValideeEvent | undefined;

            if (!decisionValideeEvent) {
                return { pass: false, message: "Échec: L'événement DECISION_VALIDEE n'a pas été trouvé." };
            }
            
            const octDetail = decisionValideeEvent.payload.detailCalcul.find(d => d.month === '10-2025');
            const novDetail = decisionValideeEvent.payload.detailCalcul.find(d => d.month === '11-2025');
            
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


export const BDDTestReconciliationRessourcesWrapper: React.FC = () => (
    <div className='space-y-4'>
        <h2 className="text-2xl font-bold mt-8 border-t pt-6">Tests BDD - Réconciliation (Mutation de Ressources)</h2>
        <TestReconciliationRessourcesAvecPaiementsEffectues />
        <TestValidationDecisionRessourcesAvecRemboursement />
    </div>
);
