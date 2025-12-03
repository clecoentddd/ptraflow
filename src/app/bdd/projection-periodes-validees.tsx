
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
        description="Etant donné que plusieurs mutations ont été validées, quand on consulte la projection, alors seule la période de la dernière mutation validée est conservée."
        given={() => {
            const events: AppEvent[] = [
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
            // We provide the events in reverse chronological order to simulate the event stream
            // But the projection logic will sort them correctly.
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
            
            const isLengthCorrect = validatedPeriods.length === 1;
            const singlePeriod = validatedPeriods[0];
            const isContentCorrect = singlePeriod?.mutationId === "6cce8359-c6b5-4497-8c88-7356230c544f"
                                  && singlePeriod?.dateDebut === "01-2025"
                                  && singlePeriod?.dateFin === "08-2025";
            
            const pass = isLengthCorrect && isContentCorrect;

            return {
                pass,
                message: pass 
                    ? `Succès: La projection ne contient que la dernière période validée (ID: ${singlePeriod?.mutationId}).` 
                    : `Échec: La projection devrait contenir 1 seule période, mais en contient ${validatedPeriods.length}. Reçu: ${JSON.stringify(validatedPeriods)}`,
            };
        }}
    />
);
