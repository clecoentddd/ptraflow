
"use client";

import React from 'react';
import type { AppState, AppEvent } from '../mutations/mutation-lifecycle/domain';
import { TestComponent } from './test-harness';

import { validatedPeriodsProjectionReducer, initialValidatedPeriodsState, queryValidatedPeriods } from '../mutations/projection-periodes-de-droits/projection';


// Definition of the BDD Test
export const BDDTestProjectionPeriodes: React.FC = () => (
    <TestComponent
        title="Test Projection Périodes Validées"
        description="Etant donné que plusieurs mutations ont été validées, quand on consulte la projection, alors seule la période de la dernière mutation validée est conservée."
        given={() => {
            const events: AppEvent[] = [
                // --- First mutation ---
                {
                    id: "dec-1",
                    type: "DECISION_VALIDEE",
                    mutationId: "0789426d-b6a8-46fb-ab76-8b86b2a423f4",
                    timestamp: "2025-12-03T19:28:57.000Z",
                    payload: {
                        mutationType: 'DROITS',
                        periodeDroits: {
                            dateDebut: "05-2025",
                            dateFin: "12-2025"
                        }
                    }
                } as any,
                
                // --- Second (later) mutation ---
                 {
                    id: "dec-2",
                    type: "DECISION_VALIDEE",
                    mutationId: "6cce8359-c6b5-4497-8c88-7356230c544f",
                    timestamp: "2025-12-03T19:29:39.000Z",
                    payload: {
                         mutationType: 'DROITS',
                        periodeDroits: {
                            dateDebut: "01-2025",
                            dateFin: "08-2025"
                        }
                    }
                } as any,
            ];
            // We provide the events in reverse chronological order to simulate the event stream
            // But the projection logic will sort them by timestamp implicitly via replay order.
            return { eventStream: events.reverse() }; // Reverse to simulate replay order (oldest first)
        }}
        when={(initialState: AppState) => {
            // WHEN: we manually run the projection logic on the given events
            let projectionState: AppState = { ...initialState, ...initialValidatedPeriodsState };
            
            // The events must be processed in chronological order for the projection to be correct
            const sortedEvents = [...initialState.eventStream].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            for (const event of sortedEvents) {
                // We call the slice reducer directly, passing the full state so it can find the DECISION_VALIDEE event
                projectionState = validatedPeriodsProjectionReducer(projectionState, event);
            }
            // We return a state shape that the 'then' block can inspect.
            return { ...initialState, ...projectionState };
        }}
        then={(state) => {
            // THEN: we use the selector to query the projection state.
            const validatedPeriods = queryValidatedPeriods(state);
            
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
