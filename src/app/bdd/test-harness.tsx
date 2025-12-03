
"use client";

import React, { useState } from 'react';
import type { AppState, AppEvent } from '../mutations/mutation-lifecycle/cqrs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { initialState, cqrsReducer } from '../mutations/mutation-lifecycle/cqrs';

// Mocked toast for testing purposes
export const mockToasts: { message: string; type: 'error' | 'success' }[] = [];
export const mockToast = {
  error: (message: string) => {
    console.error("MOCK TOAST (Error):", message);
    mockToasts.push({ message, type: 'error' });
  },
};

// This function rebuilds the read model (projection) from an event stream.
// It's used to set up the 'given' state and to get the final state for assertions.
const projectEvents = (eventStream: AppEvent[]): AppState => {
    let projectedState: AppState = { ...initialState, eventStream };
    // We use a simple reducer to apply projection logic.
    const sortedEvents = [...eventStream].reverse();
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
    when: (initialState: AppState) => AppState;
    then: (finalState: AppState, toasts: typeof mockToasts) => { pass: boolean; message: string };
}

export const TestComponent: React.FC<TestComponentProps> = ({ title, description, given, when, then }) => {
    const [result, setResult] = useState<{ pass: boolean; message: string } | null>(null);
    const [finalEventStreamForDisplay, setFinalEventStreamForDisplay] = useState<AppEvent[] | null>(null);

    const runTest = () => {
        mockToasts.length = 0; // Clear toasts for each run

        // GIVEN: Set up the initial state by projecting past events
        const initialEventStream = given().eventStream;
        const givenState = projectEvents(initialEventStream);

        // WHEN: The command handler is called on the initial state
        const stateAfterCommand = when(givenState);
        
        // We project the final event stream to get the final read model for assertion
        const finalProjectedState = projectEvents(stateAfterCommand.eventStream);
        setFinalEventStreamForDisplay(finalProjectedState.eventStream);

        // THEN: The result is checked
        const testResult = then(finalProjectedState, mockToasts);
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
