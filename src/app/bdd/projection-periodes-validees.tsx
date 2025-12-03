
"use client";

import React from 'react';
import type { AppEvent } from '../mutations/mutation-lifecycle/cqrs';
import { TestComponent } from './test-harness';

// Import event types for correct test data creation
import type { MutationValidatedEvent } from '../mutations/validate-mutation/event';


// Definition of the BDD Test
export const BDDTestProjectionPeriodes: React.FC = () => (
    <TestComponent
        title="Test Projection Périodes Validées"
        description="Etant donné que plusieurs mutations ont été validées avec des périodes de droits, quand on consulte la projection, alors les périodes sont disponibles et la plus récente est bien la première retournée par la requête de la vue."
        given={() => {
            const events: AppEvent[] = [
                // The events are in reverse chronological order (as in the real app state)
                 {
                    id: "78b8ad33-31cb-4428-9c57-3652e6412a7c",
                    type: "MUTATION_VALIDATED",
                    mutationId: "6cce8359-c6b5-4497-8c88-7356230c544f",
                    timestamp: "2025-12-03T19:29:40.062Z",
                    payload: {
                        userEmail: "anonymous",
                        dateDebut: "01-2025",
                        dateFin: "08-2025"
                    }
                } as MutationValidatedEvent,
                {
                    id: "77e6e5ce-f9ce-492c-bc4c-0622fa4cbff0",
                    type: "MUTATION_VALIDATED",
                    mutationId: "0789426d-b6a8-46fb-ab76-8b86b2a423f4",
                    timestamp: "2025-12-03T19:28:58.675Z",
                    payload: {
                        userEmail: "anonymous",
                        dateDebut: "05-2025",
                        dateFin: "12-2025"
                    }
                } as MutationValidatedEvent,
            ];
            return { eventStream: events };
        }}
        when={(initialState) => {
            // WHEN: There is no command, we are only testing the projection.
            // The projection happens automatically in the test harness.
            return initialState;
        }}
        then={(state) => {
            // THEN: we check the projection state.
            const { validatedPeriods } = state;
            
            // The view component reverses the array, so we do the same for the test
            const displayedPeriods = [...validatedPeriods].reverse();

            const isLengthCorrect = displayedPeriods.length === 2;
            const mostRecentPeriod = displayedPeriods[0];
            const isOrderCorrect = mostRecentPeriod?.mutationId === "6cce8359-c6b5-4497-8c88-7356230c544f"
                                  && mostRecentPeriod?.dateDebut === "01-2025"
                                  && mostRecentPeriod?.dateFin === "08-2025";
            
            const pass = isLengthCorrect && isOrderCorrect;

            return {
                pass,
                message: pass 
                    ? 'Succès: La projection contient les bonnes périodes et la requête de la vue les trie correctement (la plus récente en premier).' 
                    : `Échec: L'ordre ou le contenu des périodes projetées est incorrect. Période la plus récente attendue : 6cce... avec dates 01-2025/08-2025. Reçu: ${JSON.stringify(mostRecentPeriod)}`,
            };
        }}
    />
);
