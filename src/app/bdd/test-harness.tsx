
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
import { queryEcrituresByMonth } from '../mutations/projection-ecritures/projection';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


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
    // After all individual events are projected, we run a final projection step
    // for projections that depend on the final state of other projections (like the journal).
    const finalProjection = cqrsReducer(projectedState, { type: 'REPLAY_COMPLETE' } as any);
    return { ...finalProjection, eventStream }; // Ensure eventStream is the original one
}

interface TestResult {
    pass: boolean;
    message: string;
    finalState?: FullProjectionState;
}

interface TestComponentProps {
    title: string;
    description: string;
    given: () => { eventStream: AppEvent[] };
    when: (initialState: FullProjectionState) => FullProjectionState;
    then: (finalState: FullProjectionState, toasts: typeof mockToasts) => TestResult;
}

const EcrituresVisualizer: React.FC<{state: AppState, title: string}> = ({ state, title }) => {
    const { months, rows } = queryEcrituresByMonth(state);
    if (rows.length === 0) return null;

    return (
        <details className="mt-4 text-xs">
            <summary className="cursor-pointer font-medium">{title}</summary>
             <div className="overflow-x-auto mt-2">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[150px]">Écriture</TableHead>
                            {months.map(month => (
                                <TableHead key={month} className="text-right font-mono min-w-[80px]">
                                    {month}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map(row => (
                             <TableRow key={row.ecriture.id}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{row.ecriture.libelle}</span>
                                        <span className="text-muted-foreground">{row.ecriture.id.substring(0, 8)}...</span>
                                    </div>
                                </TableCell>
                                {months.map(month => (
                                    <TableCell key={`${row.ecriture.id}-${month}`} className="text-right font-mono">
                                        {row.monthlyAmounts[month] 
                                            ? <span className={row.ecriture.type === 'dépense' ? 'text-blue-600' : 'text-green-600'}>{row.monthlyAmounts[month]?.toFixed(0)}</span>
                                            : <span className="text-muted-foreground">-</span>}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </details>
    )
}

export const TestComponent: React.FC<TestComponentProps> = ({ title, description, given, when, then }) => {
    const [result, setResult] = useState<TestResult | null>(null);
    const [givenState, setGivenState] = useState<FullProjectionState | null>(null);

    const runTest = () => {
        mockToasts.length = 0; // Clear toasts for each run

        // GIVEN: Set up the initial state by projecting past events
        const initialSetup = given();
        const sortedGivenEvents = [...initialSetup.eventStream].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const projectedGivenState = projectEvents(sortedGivenEvents);
        setGivenState(projectedGivenState);

        // WHEN: The command handler or projection logic is called
        const stateAfterWhen = when(projectedGivenState);
        
        // We project the final event stream to get the final read model for assertion
        const finalProjectedState = projectEvents(stateAfterWhen.eventStream);
        
        const finalStateForAssertion = { ...finalProjectedState, ...stateAfterWhen };

        // THEN: The result is checked
        const testResult = then(finalStateForAssertion, mockToasts);
        setResult({ ...testResult, finalState: finalStateForAssertion });
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
                        <div className="space-y-4">
                            {givenState && <EcrituresVisualizer state={givenState} title="Voir état initial des écritures" />}
                            {result.finalState && <EcrituresVisualizer state={result.finalState} title="Voir état final des écritures" />}
                        </div>
                         <details className="mt-4 text-xs text-muted-foreground">
                            <summary>Voir le flux d'événements final</summary>
                            <pre className="mt-2 p-2 bg-muted rounded-md overflow-x-auto">{JSON.stringify(result.finalState?.eventStream ?? [], null, 2)}</pre>
                        </details>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
