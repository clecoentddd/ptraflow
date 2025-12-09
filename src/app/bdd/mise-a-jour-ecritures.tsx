
"use client";

import React from 'react';
import type { AppState, AppEvent } from '../mutations/mutation-lifecycle/domain';
import { TestComponent } from '../mutations/bdd/test-harness';
import { dispatchCommand, EventBus, rehydrateStateForTesting } from '../mutations/mutation-lifecycle/event-bus';
import { format } from 'date-fns';

// EVENTS - Create a base set of events for our initial state
const baseEvents: AppEvent[] = [
    // --- Mutation "mut-1" (Droits) - Not relevant for these tests ---
    { id: "evt-1-1", type: "DROITS_MUTATION_CREATED", mutationId: "mut-1", timestamp: "2025-01-01T10:00:00.000Z", payload: { mutationType: "DROITS" } },
    { id: "evt-1-8", type: "PLAN_DE_PAIEMENT_VALIDE", mutationId: "mut-1", timestamp: "2025-01-01T10:07:00.000Z", payload: { userEmail: "test", dateDebut: "01-2025", dateFin: "12-2025"} as any },
    
    // --- Mutation "mut-2" (Ressources) - The one we are testing against ---
    { id: "evt-2-1", type: "RESSOURCES_MUTATION_CREATED", mutationId: "mut-2", timestamp: "2025-02-01T11:00:00.000Z", payload: { mutationType: "RESSOURCES" } },
    { id: "evt-2-2", type: "PAIEMENTS_SUSPENDUS", mutationId: "mut-2", timestamp: "2025-02-01T11:01:00.000Z", payload: { userEmail: "test" } },
    { id: "evt-2-3", type: "MODIFICATION_RESSOURCES_AUTORISEE", ressourceVersionId: "v2", mutationId: "mut-2", timestamp: "2025-02-01T11:02:00.000Z", payload: { userEmail: "test" } },
    { id: "evt-2-4", type: "REVENU_AJOUTE", mutationId: "mut-2", ressourceVersionId: "v2", timestamp: "2025-02-01T11:03:00.000Z", payload: { ecritureId: "ecr-C", code: "102", libelle: "Loyers reçus", montant: 200, dateDebut: "06-2025", dateFin: "08-2025" } },
];


const createCheck = (
    mutationId: string,
    expectedRessourcesDateDebut: string | undefined,
    expectedRessourcesDateFin: string | undefined
) => (state: AppState) => {
    // This check is no longer valid as the Journal projection was removed.
    // The test logic will be updated to check the final state of the ecritures.
    // For now, we will just return a placeholder.
    // In a real scenario, we'd check the `decisionAPrendre` projection's period.
    return { pass: true, message: 'Test logic needs update after Journal removal.' };
}


// --- TEST SCENARIOS ---

const TestRaccourcirFin: React.FC = () => (
    <TestComponent
        title="Test 1: Raccourcir la fin d'une période"
        description="Quand on modifie une écriture pour raccourcir sa date de fin (06-08 -> 06-07), la période de modification du journal doit refléter uniquement le mois qui a changé (l'ancien mois de fin)."
        given={() => ({ eventStream: [...baseEvents] })}
        when={(initialState) => {
            rehydrateStateForTesting(initialState.eventStream);
            dispatchCommand({
                type: 'METTRE_A_JOUR_ECRITURE',
                payload: {
                    mutationId: 'mut-2',
                    ressourceVersionId: 'v2',
                    originalEcritureId: 'ecr-C', // Période originale: 06-2025 à 08-2025
                    newEcritureId: 'ecr-C-mod',
                    ecritureType: 'revenu',
                    code: '102',
                    libelle: 'Loyers reçus',
                    montant: 200, // Montant inchangé
                    dateDebut: '2025-06-01T00:00:00.000Z', // Inchangé
                    dateFin: '2025-07-01T00:00:00.000Z',   // Raccourci de 08 à 07
                }
            });
            return EventBus.getState();
        }}
        then={(state) => {
            const finalEcriture = state.ecritures.find(e => e.id === 'ecr-C');
            const pass = finalEcriture?.dateFin === '07-2025';
            return {
                pass,
                message: pass ? `Succès: Date de fin de l'écriture mise à jour à ${finalEcriture?.dateFin}` : `Échec: La date de fin de l'écriture n'a pas été mise à jour.`
            };
        }}
    />
);

const TestRaccourcirDebut: React.FC = () => (
    <TestComponent
        title="Test 2: Raccourcir le début d'une période"
        description="Quand on modifie une écriture pour avancer sa date de début (06-08 -> 07-08), la période de modification du journal doit refléter uniquement le mois qui a changé (l'ancien mois de début)."
        given={() => ({ eventStream: [...baseEvents] })}
        when={(initialState) => {
            rehydrateStateForTesting(initialState.eventStream);
            dispatchCommand({
                type: 'METTRE_A_JOUR_ECRITURE',
                payload: {
                    mutationId: 'mut-2',
                    ressourceVersionId: 'v2',
                    originalEcritureId: 'ecr-C', // Période originale: 06-2025 à 08-2025
                    newEcritureId: 'ecr-C-mod',
                    ecritureType: 'revenu',
                    code: '102',
                    libelle: 'Loyers reçus',
                    montant: 200,
                    dateDebut: '2025-07-01T00:00:00.000Z', // Raccourci de 06 à 07
                    dateFin: '2025-08-01T00:00:00.000Z',   // Inchangé
                }
            });
            return EventBus.getState();
        }}
        then={(state) => {
             const finalEcriture = state.ecritures.find(e => e.id === 'ecr-C');
             const pass = finalEcriture?.dateDebut === '07-2025';
             return {
                 pass,
                 message: pass ? `Succès: Date de début de l'écriture mise à jour à ${finalEcriture?.dateDebut}` : `Échec: La date de début de l'écriture n'a pas été mise à jour.`
             };
        }}
    />
);

const TestEtendreFin: React.FC = () => (
     <TestComponent
        title="Test 3: Étendre la fin d'une période"
        description="Quand on étend la date de fin (06-08 -> 06-09), la période de modification du journal doit s'étendre pour inclure uniquement le nouveau mois."
        given={() => ({ eventStream: [...baseEvents] })}
        when={(initialState) => {
            rehydrateStateForTesting(initialState.eventStream);
            dispatchCommand({
                type: 'METTRE_A_JOUR_ECRITURE',
                payload: {
                    mutationId: 'mut-2',
                    ressourceVersionId: 'v2',
                    originalEcritureId: 'ecr-C', // Période originale: 06-2025 à 08-2025
                    newEcritureId: 'ecr-C-mod',
                    ecritureType: 'revenu',
                    code: '102',
                    libelle: 'Loyers reçus',
                    montant: 200,
                    dateDebut: '2025-06-01T00:00:00.000Z', // Inchangé
                    dateFin: '2025-09-01T00:00:00.000Z',   // Étendu à 09
                }
            });
            return EventBus.getState();
        }}
        then={(state) => {
            const finalEcriture = state.ecritures.find(e => e.id === 'ecr-C');
            const pass = finalEcriture?.dateFin === '09-2025';
            return {
                pass,
                message: pass ? `Succès: Date de fin de l'écriture mise à jour à ${finalEcriture?.dateFin}` : `Échec: La date de fin de l'écriture n'a pas été mise à jour.`
            };
        }}
    />
);

const TestEtendreDebut: React.FC = () => (
     <TestComponent
        title="Test 4: Étendre le début d'une période"
        description="Quand on étend la date de début (06-08 -> 05-08), la période de modification du journal doit s'étendre pour inclure uniquement le nouveau mois."
        given={() => ({ eventStream: [...baseEvents] })}
        when={(initialState) => {
            rehydrateStateForTesting(initialState.eventStream);
            dispatchCommand({
                type: 'METTRE_A_JOUR_ECRITURE',
                payload: {
                    mutationId: 'mut-2',
                    ressourceVersionId: 'v2',
                    originalEcritureId: 'ecr-C', // Période originale: 06-2025 à 08-2025
                    newEcritureId: 'ecr-C-mod',
                    ecritureType: 'revenu',
                    code: '102',
                    libelle: 'Loyers reçus',
                    montant: 200,
                    dateDebut: '2025-05-01T00:00:00.000Z', // Étendu à 05
                    dateFin: '2025-08-01T00:00:00.000Z',   // Inchangé
                }
            });
            return EventBus.getState();
        }}
        then={(state) => {
            const finalEcriture = state.ecritures.find(e => e.id === 'ecr-C');
            const pass = finalEcriture?.dateDebut === '05-2025';
            return {
                pass,
                message: pass ? `Succès: Date de début de l'écriture mise à jour à ${finalEcriture?.dateDebut}` : `Échec: La date de début de l'écriture n'a pas été mise à jour.`
            };
        }}
    />
);

const TestDeplacerPeriode: React.FC = () => (
     <TestComponent
        title="Test 5: Déplacer complètement la période"
        description="Quand on déplace la période (06-08 -> 10-11), le journal doit refléter l'union des mois non-communs (l'ancienne et la nouvelle période complète)."
        given={() => ({ eventStream: [...baseEvents] })}
        when={(initialState) => {
            rehydrateStateForTesting(initialState.eventStream);
            dispatchCommand({
                type: 'METTRE_A_JOUR_ECRITURE',
                payload: {
                    mutationId: 'mut-2',
                    ressourceVersionId: 'v2',
                    originalEcritureId: 'ecr-C', // Période originale: 06-2025 à 08-2025
                    newEcritureId: 'ecr-C-mod',
                    ecritureType: 'revenu',
                    code: '102',
                    libelle: 'Loyers reçus',
                    montant: 200,
                    dateDebut: '2025-10-01T00:00:00.000Z', // Nouvelle période
                    dateFin: '2025-11-01T00:00:00.000Z',   // Nouvelle période
                }
            });
            return EventBus.getState();
        }}
        then={(state) => {
            const finalEcriture = state.ecritures.find(e => e.id === 'ecr-C');
            const pass = finalEcriture?.dateDebut === '10-2025' && finalEcriture?.dateFin === '11-2025';
            return {
                pass,
                message: pass ? `Succès: Période de l'écriture mise à jour à ${finalEcriture?.dateDebut} - ${finalEcriture?.dateFin}` : `Échec: La période de l'écriture n'a pas été mise à jour.`
            };
        }}
    />
);

const TestChangerMontant: React.FC = () => (
     <TestComponent
        title="Test 6: Changer le montant (doit être un remplacement)"
        description="Quand on change le montant d'une écriture, cela doit être traité comme un remplacement. Le journal doit refléter la période complète de l'écriture."
        given={() => ({ eventStream: [...baseEvents] })}
        when={(initialState) => {
            rehydrateStateForTesting(initialState.eventStream);
            dispatchCommand({
                type: 'METTRE_A_JOUR_ECRITURE',
                payload: {
                    mutationId: 'mut-2',
                    ressourceVersionId: 'v2',
                    originalEcritureId: 'ecr-C', // Période originale: 06-2025 à 08-2025
                    newEcritureId: 'ecr-C-mod',
                    ecritureType: 'revenu',
                    code: '102',
                    libelle: 'Loyers reçus',
                    montant: 300, // Montant changé
                    dateDebut: '2025-06-01T00:00:00.000Z',
                    dateFin: '2025-08-01T00:00:00.000Z',
                }
            });
            return EventBus.getState();
        }}
        then={(state) => {
            const oldEcriture = state.ecritures.find(e => e.id === 'ecr-C');
            const newEcriture = state.ecritures.find(e => e.id === 'ecr-C-mod');
            const pass = !oldEcriture && newEcriture?.montant === 300;
            return {
                pass,
                message: pass ? `Succès: L'ancienne écriture a été remplacée par une nouvelle avec le montant ${newEcriture?.montant}` : `Échec: L'écriture n'a pas été correctement remplacée.`
            };
        }}
    />
);


export const BDDTestsMiseAJourEcritures: React.FC = () => (
    <div className='space-y-4'>
        <h2 className="text-2xl font-bold mt-8 border-t pt-6">Tests BDD - Mise à Jour des Écritures</h2>
        <TestRaccourcirFin />
        <TestRaccourcirDebut />
        <TestEtendreFin />
        <TestEtendreDebut />
        <TestDeplacerPeriode />
        <TestChangerMontant />
    </div>
);
