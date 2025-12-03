
"use client";

import React, { useState } from 'react';
import type { AppState, AppEvent, AppCommand } from '../mutations/mutation-lifecycle/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { initialState, cqrsReducer } from '../mutations/mutation-lifecycle/cqrs';
import type { ValidatedPeriodsState } from '../mutations/projection-periodes-de-droits/projection';
import type { MutationsState } from '../mutations/projection-mutations/projection';
import type { TodolistState } from '../mutations/projection-todolist/projection';


// Mocked toast for testing purposes
export const mockToasts: { message: string; type: 'error' | 'success' }[] = [];
export const mockToast = {
  error: (message: string) => {
    console.log("MOCK TOAST (Error):", message);
    mockToasts.push({ message, type: 'error' });
  },
};

type FullProjectionState = AppState & ValidatedPeriodsState & MutationsState & TodolistState;

// This function rebuilds the read model (projection) from an event stream.
// It's used to set up the 'given' state and to get the final state for assertions.
const projectEvents = (eventStream: AppEvent[]): FullProjectionState => {
    let projectedState: AppState = { ...initialState, eventStream };
    // We use a simple reducer to apply projection logic.
    // The events must be processed in chronological order for the projection to be correct
    const sortedEvents = [...eventStream].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // This is a simplified version of the full cqrsReducer, focusing only on projection.
    for (const event of sortedEvents) {
        projectedState = cqrsReducer(projectedState, { type: 'REPLAY', event } as any);
    }
    const finalProjection = cqrsReducer(projectedState, { type: 'REPLAY_COMPLETE' } as any);
    return { ...finalProjection, eventStream }; // Ensure eventStream is the original one
}

interface TestComponentProps {
    title: string;
    description: string;
    given: () => { eventStream: AppEvent[] };
    when: (initialState: FullProjectionState) => FullProjectionState;
    then: (finalState: FullProjectionState, toasts: typeof mockToasts) => { pass: boolean; message: string };
}

export const TestComponent: React.FC<TestComponentProps> = ({ title, description, given, when, then }) => {
    const [result, setResult] = useState<{ pass: boolean; message: string } | null>(null);
    const [finalEventStreamForDisplay, setFinalEventStreamForDisplay] = useState<AppEvent[] | null>(null);

    const runTest = () => {
        mockToasts.length = 0; // Clear toasts for each run

        // GIVEN: Set up the initial state by projecting past events
        const initialSetup = given();
        // The events must be processed in chronological order.
        const sortedGivenEvents = [...initialSetup.eventStream].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const givenState = projectEvents(sortedGivenEvents);

        // WHEN: The command handler or projection logic is called
        const stateAfterWhen = when(givenState);
        
        // We project the final event stream to get the final read model for assertion
        const finalProjectedState = projectEvents(stateAfterWhen.eventStream);
        
        // Special case for projection tests: merge the manually projected state from 'when' block
        const finalStateForAssertion = { ...finalProjectedState, ...stateAfterWhen };

        setFinalEventStreamForDisplay(finalStateForAssertion.eventStream);

        // THEN: The result is checked
        const testResult = then(finalStateForAssertion, mockToasts);
        setResult(testResult);
    };

    return (
        <Card className={result ? (result.pass ? 'border-green-500' : 'border-red-500') : ''}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {result && (result.pass ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />)}
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {result === null && <Button onClick={runTest}>Exécuter le test</Button>}
                {result && (
                    <div>
                        <p className={result.pass ? 'text-green-700' : 'text-red-700'}>{result.message}</p>
                        {finalEventStreamForDisplay && (
                             <details className="mt-4 text-xs text-muted-foreground">
                                <summary>Voir le flux d'événements final</summary>
                                <pre className="mt-2 p-2 bg-muted rounded-md overflow-x-auto">{JSON.stringify(finalEventStreamForDisplay, null, 2)}</pre>
                            </details>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
