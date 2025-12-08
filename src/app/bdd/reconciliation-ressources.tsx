
"use client";

import React from 'react';
import type { AppState, AppEvent } from '../mutations/mutation-lifecycle/domain';
import { TestComponent } from '../mutations/bdd/test-harness';
import { cqrsReducer } from '../mutations/mutation-lifecycle/cqrs';
import { queryDecisionsAPrendre } from '../mutations/projection-decision-a-prendre/projection';
import type { DecisionValideeEvent } from '../mutations/valider-decision/event';

const TestReconciliationRessourcesAvecPaiementsEffectues: React.FC = () => (
    <TestComponent
        title="Test Réconciliation (Mutation Ressources) - Périodes Modifiées Uniquement"
        description="Etant donné un paiement exécuté en Oct-25, quand une nouvelle MUTATION DE RESSOURCES ne modifie les calculs que pour Nov-25 et Dec-25, alors la projection de la décision ne doit contenir QUE les mois modifiés (Nov, Dec) et non l'ancien mois (Oct). Le test doit échouer car la logique actuelle inclut à tort Octobre."
        given={() => {
            const events: AppEvent[] = [
                // --- First Plan (Executed) from a DROITS mutation ---
                { id: "evt-plan1-reco-res", type: "PLAN_DE_PAIEMENT_VALIDE", mutationId: "mut-reco-res-1", timestamp: "2025-09-01T10:00:00.000Z", payload: { planDePaiementId: "plan-reco-res-1", decisionId: "dec-reco-res-1", detailCalcul: [] } as any },
                { id: "tx-creee-oct-reco-res", type: "TRANSACTION_CREEE", mutationId: "mut-reco-res-1", timestamp: "2025-09-01T10:01:00.000Z", payload: { transactionId: "tx-oct-reco-res", planDePaiementId: "plan-reco-res-1", mois: "10-2025", montant: 500 } as any },
                { id: "tx-creee-nov-reco-res", type: "TRANSACTION_CREEE", mutationId: "mut-reco-res-1", timestamp: "2025-09-01T10:02:00.000Z", payload: { transactionId: "tx-nov-reco-res", planDePaiementId: "plan-reco-res-1", mois: "11-2025", montant: 300 } as any },
                { id: "tx-exec-oct-reco-res", type: "TRANSACTION_EFFECTUEE", mutationId: "mut-reco-res-1", timestamp: "2025-10-05T10:00:00.000Z", payload: { transactionId: "tx-oct-reco-res" } as any },

                // --- New RESSOURCES Mutation (In Progress) ---
                { id: "evt-mut-reco-res-2-created", type: "RESSOURCES_MUTATION_CREATED", mutationId: "mut-reco-res-2", timestamp: "2025-11-01T09:00:00.000Z", payload: { mutationType: 'RESSOURCES'} as any },
                { id: "evt-mut-reco-res-2-suspended", type: "PAIEMENTS_SUSPENDUS", mutationId: "mut-reco-res-2", timestamp: "2025-11-01T09:01:00.000Z", payload: { userEmail: 'test'} as any },
                // This event is NECESSARY for the journal to know the modified period
                { id: "evt-rev-added-for-reco", type: "REVENU_AJOUTE", mutationId: "mut-reco-res-2", ressourceVersionId: "v-reco-res-2", timestamp: "2025-11-01T09:01:30.000Z", payload: { ecritureId: "ecr-reco-res", code: "101", libelle: "Salaire", montant: 8000, dateDebut: "11-2025", dateFin: "12-2025" } as any },
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
            } as any;
            return cqrsReducer(initialState, { type: 'REPLAY', eventStream: [...initialState.eventStream, newCalculationEvent] });
        }}
        then={(finalState) => {
            const decisions = queryDecisionsAPrendre(finalState);
            const decision = decisions.find(d => d.mutationId === 'mut-reco-res-2');
            const decisionDetail = decision?.planDeCalcul?.detail;
            
            // For a RESSOURCES mutation, the decision should ONLY contain the modified months.
            const pass = decisionDetail?.length === 2 
                         && decisionDetail.some(d => d.month === '11-2025')
                         && decisionDetail.some(d => d.month === '12-2025')
                         && !decisionDetail.some(d => d.month === '10-2025');

            return {
                pass,
                message: pass
                    ? `Succès: La projection de décision a été correctement filtrée pour ne contenir que les mois modifiés.`
                    : `ÉCHEC: La décision devrait contenir 2 mois, mais en contient ${decisionDetail?.length}. Le mois d'Octobre a été inclus à tort.`
            };
        }}
    />
);

const TestValidationDecisionRessourcesAvecPeriodeIncorrecte: React.FC = () => (
    <TestComponent
        title="Test Validation Décision (Mutation Ressources) - Vérification des périodes"
        description="Etant donné une décision (issue d'une mutation de RESSOURCES) qui inclut à tort un mois non modifié (Octobre), quand l'utilisateur valide cette décision, alors l'événement DecisionValideeEvent doit également ne contenir QUE les mois réellement modifiés (Nov, Dec). Le test doit échouer."
        given={() => {
            const events: AppEvent[] = [
                // --- Setup from a DROITS mutation ---
                { id: "evt-plan-remboursement-res", type: "PLAN_DE_PAIEMENT_VALIDE", mutationId: "mut-remboursement-res-1", timestamp: "2025-09-01T10:00:00.000Z", payload: { planDePaiementId: "plan-remboursement-res", decisionId: "dec-remboursement-res", detailCalcul: [] } as any },
                { id: "tx-creee-oct-remboursement-res", type: "TRANSACTION_CREEE", mutationId: "mut-remboursement-res-1", timestamp: "2025-09-01T10:01:00.000Z", payload: { transactionId: "tx-oct-remboursement-res", planDePaiementId: "plan-remboursement-res", mois: "10-2025", montant: 50 } as any },
                { id: "tx-exec-oct-remboursement-res", type: "TRANSACTION_EFFECTUEE", mutationId: "mut-remboursement-res-1", timestamp: "2025-10-05T10:00:00.000Z", payload: { transactionId: "tx-oct-remboursement-res" } as any },
                
                // --- New RESSOURCES mutation that will lead to a new calculation ---
                { id: "evt-mut-remboursement-res-2-created", type: "RESSOURCES_MUTATION_CREATED", mutationId: "mut-remboursement-res-2", timestamp: "2025-11-01T09:00:00.000Z", payload: { mutationType: 'RESSOURCES'} as any },
                { id: "evt-mut-remboursement-res-2-suspended", type: "PAIEMENTS_SUSPENDUS", mutationId: "mut-remboursement-res-2", timestamp: "2025-11-01T09:01:00.000Z", payload: { userEmail: 'test'} as any },
                 // This event is NECESSARY for the journal to know the modified period
                { id: "evt-rev-added-for-validation", type: "REVENU_AJOUTE", mutationId: "mut-remboursement-res-2", ressourceVersionId: "v-remboursement-res-2", timestamp: "2025-11-01T09:01:30.000Z", payload: { ecritureId: "ecr-validation-res", code: "101", libelle: "Salaire", montant: 1000, dateDebut: "11-2025", dateFin: "12-2025" } as any },
                { id: "evt-mut-remboursement-res-2-calcul", type: "PLAN_CALCUL_EFFECTUE", mutationId: "mut-remboursement-res-2", timestamp: "2025-11-01T09:02:00.000Z", ressourceVersionId: 'v-remboursement-res-2', payload: { calculId: 'calcul-remboursement-res-2', detail: [
                    // The new calculation is only for Nov and Dec
                     { month: '11-2025', revenus: 1000, depenses: 0, resultat: 1000, calcul: 100 },
                     { month: '12-2025', revenus: 1000, depenses: 0, resultat: 1000, calcul: 100 }
                ]} as any },
            ];
            // After these events, queryDecisionsAPrendre will show a decision for Nov, Dec.
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
            
            const detail = decisionValideeEvent.payload.detailCalcul;
            
            // THIS IS THE FAILURE CONDITION
            // The handler still includes October because it reads from the faulty decision projection
            const pass = detail.length === 2
                         && detail.some(d => d.month === '11-2025')
                         && detail.some(d => d.month === '12-2025')
                         && !detail.some(d => d.month === '10-2025');
            
            return {
                pass,
                message: pass
                    ? `Succès: L'événement DECISION_VALIDEE a été correctement filtré pour ne contenir que les mois modifiés.`
                    : `ÉCHEC: L'événement DECISION_VALIDEE devrait contenir 2 mois, mais en contient ${detail.length}. Le mois d'Octobre est inclus à tort.`
            };
        }}
    />
);


export const BDDTestReconciliationRessourcesWrapper: React.FC = () => (
    <div className='space-y-4'>
        <h2 className="text-2xl font-bold mt-8 border-t pt-6">Tests BDD - Réconciliation (Mutation de Ressources)</h2>
        <TestReconciliationRessourcesAvecPaiementsEffectues />
        <TestValidationDecisionRessourcesAvecPeriodeIncorrecte />
    </div>
);

    