
"use client";

import React from 'react';
import type { AppState } from '../mutations/mutation-lifecycle/domain';
import { TestComponent, mockToast } from './test-harness';
import { cqrsReducer, initialState } from '../mutations/mutation-lifecycle/cqrs';

// EVENTS - Create a base set of events for our initial state
const baseEvents = [
    // --- Mutation "mut-1" (Droits) ---
    { id: "evt-1-1", type: "DROITS_MUTATION_CREATED", mutationId: "mut-1", timestamp: "2025-01-01T10:00:00.000Z", payload: { mutationType: "DROITS" } },
    { id: "evt-1-2", type: "PAIEMENTS_SUSPENDUS", mutationId: "mut-1", timestamp: "2025-01-01T10:01:00.000Z", payload: { userEmail: "test" } },
    { id: "evt-1-3", type: "MODIFICATION_DROITS_AUTORISEE", mutationId: "mut-1", timestamp: "2025-01-01T10:02:00.000Z", payload: { userEmail: "test" } },
    { id: "evt-1-4", type: "DROITS_ANALYSES", mutationId: "mut-1", timestamp: "2025-01-01T10:03:00.000Z", payload: { userEmail: "test", dateDebut: "01-2025", dateFin: "12-2025" } },
    { id: "evt-1-5", type: "MODIFICATION_RESSOURCES_AUTORISEE", mutationId: "mut-1", ressourceVersionId: "v1", timestamp: "2025-01-01T10:04:00.000Z", payload: { userEmail: "test" } },
    { id: "evt-1-6", type: "REVENU_AJOUTE", mutationId: "mut-1", ressourceVersionId: "v1", timestamp: "2025-01-01T10:05:00.000Z", payload: { ecritureId: "ecr-A", code: "101", libelle: "Salaire", montant: 1000, dateDebut: "01-2025", dateFin: "12-2025" } },
    { id: "evt-1-7", type: "DEPENSE_AJOUTEE", mutationId: "mut-1", ressourceVersionId: "v1", timestamp: "2025-01-01T10:06:00.000Z", payload: { ecritureId: "ecr-B", code: "202", libelle: "Loyer", montant: 500, dateDebut: "03-2025", dateFin: "05-2025" } },
    { id: "evt-1-8", type: "MODIFICATION_RESSOURCES_VALIDEE", mutationId: "mut-1", ressourceVersionId: "v1", timestamp: "2025-01-01T10:07:00.000Z", payload: { userEmail: "test" } },
    
    // --- Mutation "mut-2" (Ressources) ---
    { id: "evt-2-1", type: "RESSOURCES_MUTATION_CREATED", mutationId: "mut-2", timestamp: "2025-02-01T11:00:00.000Z", payload: { mutationType: "RESSOURCES" } },
    { id: "evt-2-2", type: "PAIEMENTS_SUSPENDUS", mutationId: "mut-2", timestamp: "2025-02-01T11:01:00.000Z", payload: { userEmail: "test" } },
    { id: "evt-2-3", type: "MODIFICATION_RESSOURCES_AUTORISEE", mutationId: "mut-2", ressourceVersionId: "v2", timestamp: "2025-02-01T11:02:00.000Z", payload: { userEmail: "test" } },
    { id: "evt-2-4", type: "REVENU_AJOUTE", mutationId: "mut-2", ressourceVersionId: "v2", timestamp: "2025-02-01T11:03:00.000Z", payload: { ecritureId: "ecr-C", code: "102", libelle: "Loyers reçus", montant: 200, dateDebut: "06-2025", dateFin: "08-2025" } },
];


const createCheck = (
    mutationId: string,
    expectedRessourcesDateDebut: string | undefined,
    expectedRessourcesDateFin: string | undefined
) => (state: AppState) => {
    const journal = state.journal;
    const journalEntry = journal.find(j => j.mutationId === mutationId);

    // This is the core logic that was failing.
    // The journal entry's dates are now calculated by the `rebuildJournal` function.
    const actualDebut = journalEntry?.ressourcesDateDebut;
    const actualFin = journalEntry?.ressourcesDateFin;

    const pass = actualDebut === expectedRessourcesDateDebut && actualFin === expectedRessourcesDateFin;
    const message = pass
        ? `Succès: La période de modification est bien [${expectedRessourcesDateDebut || 'N/A'} - ${expectedRessourcesDateFin || 'N/A'}].`
        : `Échec: Période attendue [${expectedRessourcesDateDebut || 'N/A'} - ${expectedRessourcesDateFin || 'N/A'}], mais reçu [${actualDebut || 'N/A'} - ${actualFin || 'N/A'}].`;
    
    return { pass, message };
}


// --- TEST SCENARIOS ---

const TestRaccourcirFin: React.FC = () => (
    <TestComponent
        title="Test 1: Raccourcir la fin d'une période"
        description="Quand on modifie une écriture pour raccourcir sa date de fin (06-08 -> 06-07), la période de modification du journal doit refléter la totalité de l'ancienne et de la nouvelle période, car c'est un remplacement."
        given={() => ({ eventStream: baseEvents })}
        when={(initialState) => cqrsReducer(initialState, {
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
        })}
        then={(state) => createCheck('mut-2', "06-2025", "08-2025")(state)}
    />
);

const TestRaccourcirDebut: React.FC = () => (
    <TestComponent
        title="Test 2: Raccourcir le début d'une période"
        description="Quand on modifie une écriture pour avancer sa date de début (06-08 -> 07-08), la période de modification du journal doit refléter la totalité de l'ancienne et de la nouvelle période."
        given={() => ({ eventStream: baseEvents })}
        when={(initialState) => cqrsReducer(initialState, {
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
        })}
        then={(state) => createCheck('mut-2', "06-2025", "08-2025")(state)}
    />
);

const TestEtendreFin: React.FC = () => (
     <TestComponent
        title="Test 3: Étendre la fin d'une période"
        description="Quand on étend la date de fin (06-08 -> 06-09), la période de modification du journal doit s'étendre pour inclure le nouveau mois."
        given={() => ({ eventStream: baseEvents })}
        when={(initialState) => cqrsReducer(initialState, {
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
        })}
        then={(state) => createCheck('mut-2', "06-2025", "09-2025")(state)}
    />
);

const TestEtendreDebut: React.FC = () => (
     <TestComponent
        title="Test 4: Étendre le début d'une période"
        description="Quand on étend la date de début (06-08 -> 05-08), la période de modification du journal doit s'étendre pour inclure le nouveau mois."
        given={() => ({ eventStream: baseEvents })}
        when={(initialState) => cqrsReducer(initialState, {
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
        })}
        then={(state) => createCheck('mut-2', "05-2025", "08-2025")(state)}
    />
);

const TestDeplacerPeriode: React.FC = () => (
     <TestComponent
        title="Test 5: Déplacer complètement la période"
        description="Quand on déplace la période (06-08 -> 10-11), le journal doit refléter l'union de l'ancienne et de la nouvelle période."
        given={() => ({ eventStream: baseEvents })}
        when={(initialState) => cqrsReducer(initialState, {
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
        })}
        then={(state) => createCheck('mut-2', "06-2025", "11-2025")(state)}
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
        {/* On peut rajouter 5 autres tests ici plus tard */}
    </div>
);
