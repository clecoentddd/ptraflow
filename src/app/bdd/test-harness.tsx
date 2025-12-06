
"use client";

import React, { useState } from 'react';
import type { AppState, AppEvent, Ecriture } from '../mutations/mutation-lifecycle/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { initialState, cqrsReducer } from '../mutations/mutation-lifecycle/cqrs';
import type { ValidatedPeriodsState } from '../mutations/projection-periodes-de-droits/projection';
import type { MutationsState } from '../mutations/projection-mutations/projection';
import type { TodolistState } from '../mutations/projection-todolist/projection';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { eachMonthOfInterval, format, parse } from 'date-fns';


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


const EventsVisualizer: React.FC<{events: AppEvent[], title: string}> = ({ events, title }) => {
    // 1. Find all unique ecriture IDs from the events
    const ecritureIds = Array.from(new Set(events.map(e => {
        if ('payload' in e && e.payload && typeof e.payload === 'object' && 'ecritureId' in e.payload) {
            return (e.payload as { ecritureId: string }).ecritureId;
        }
        return null;
    }).filter(id => id !== null) as string[]));

    if (ecritureIds.length === 0) return null;

    // 2. Determine the full date range to display
    const allDates: Date[] = [];
    events.forEach(e => {
        if ('payload' in e && e.payload && typeof e.payload === 'object') {
            const payload = e.payload as any;
            if (payload.dateDebut) allDates.push(parse(payload.dateDebut, 'MM-yyyy', new Date()));
            if (payload.dateFin) allDates.push(parse(payload.dateFin, 'MM-yyyy', new Date()));
            if (payload.originalDateDebut) allDates.push(parse(payload.originalDateDebut, 'MM-yyyy', new Date()));
            if (payload.originalDateFin) allDates.push(parse(payload.originalDateFin, 'MM-yyyy', new Date()));
            if (payload.newDateDebut) allDates.push(parse(payload.newDateDebut, 'MM-yyyy', new Date()));
            if (payload.newDateFin) allDates.push(parse(payload.newDateFin, 'MM-yyyy', new Date()));
        }
    });

    if (allDates.length < 2) return null; // Not enough data for a range

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    if (isNaN(minDate.getTime()) || isNaN(maxDate.getTime()) || minDate > maxDate) return null;

    const months = eachMonthOfInterval({ start: minDate, end: maxDate }).map(d => format(d, 'MM-yyyy'));

    // 3. Create a map of events by ecritureId and month
    const eventMap: Record<string, Record<string, AppEvent[]>> = {};

    for (const ecritureId of ecritureIds) {
        eventMap[ecritureId] = {};
        for (const month of months) {
            eventMap[ecritureId][month] = [];
        }
    }

    events.forEach(event => {
        if (!('payload' in event) || !event.payload || typeof event.payload !== 'object' || !('ecritureId' in event.payload)) return;
        
        const payload = event.payload as any;
        const ecritureId = payload.ecritureId;

        // Define which dates to use for period calculation for each event type
        let startDateStr, endDateStr;
        if (event.type === 'ECRITURE_PERIODE_CORRIGEE') {
            // For correction, we want to see the effect on both old and new periods
            const oldStart = parse(payload.originalDateDebut, 'MM-yyyy', new Date());
            const oldEnd = parse(payload.originalDateFin, 'MM-yyyy', new Date());
            const newStart = parse(payload.newDateDebut, 'MM-yyyy', new Date());
            const newEnd = parse(payload.newDateFin, 'MM-yyyy', new Date());
            const start = new Date(Math.min(oldStart.getTime(), newStart.getTime()));
            const end = new Date(Math.max(oldEnd.getTime(), newEnd.getTime()));
            startDateStr = format(start, 'MM-yyyy');
            endDateStr = format(end, 'MM-yyyy');

        } else if (payload.dateDebut && payload.dateFin) {
            startDateStr = payload.dateDebut;
            endDateStr = payload.dateFin;
        }

        if (startDateStr && endDateStr) {
            const start = parse(startDateStr, 'MM-yyyy', new Date());
            const end = parse(endDateStr, 'MM-yyyy', new Date());
            if (start <= end) {
                const interval = eachMonthOfInterval({ start, end });
                interval.forEach(monthDate => {
                    const monthKey = format(monthDate, 'MM-yyyy');
                    if (eventMap[ecritureId] && eventMap[ecritureId][monthKey]) {
                        eventMap[ecritureId][monthKey].push(event);
                    }
                });
            }
        }
    });

    return (
         <details className="mt-4 text-xs">
            <summary className="cursor-pointer font-medium">{title}</summary>
             <div className="overflow-x-auto mt-2">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[150px]">Écriture ID</TableHead>
                            {months.map(month => (
                                <TableHead key={month} className="text-center font-mono min-w-[120px]">
                                    {month}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ecritureIds.map(ecritureId => (
                             <TableRow key={ecritureId}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-mono text-xs">{ecritureId.substring(0,8)}...</span>
                                    </div>
                                </TableCell>
                                {months.map(month => (
                                    <TableCell key={`${ecritureId}-${month}`} className="text-center font-mono align-top">
                                        {eventMap[ecritureId][month].length > 0 ? (
                                            <div className="flex flex-col gap-1 items-center">
                                                {eventMap[ecritureId][month].map(e => (
                                                    <div key={e.id} className={`text-white text-[10px] rounded-full px-2 py-0.5 ${e.type === 'ECRITURE_PERIODE_CORRIGEE' ? 'bg-orange-500' : 'bg-purple-500'}`}>
                                                        {e.type.split('_').pop()?.substring(0,3)}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <span className="text-muted-foreground">-</span>}
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
    const [givenEvents, setGivenEvents] = useState<AppEvent[] | null>(null);

    const runTest = () => {
        mockToasts.length = 0; // Clear toasts for each run

        // GIVEN: Set up the initial state by projecting past events
        const initialSetup = given();
        const sortedGivenEvents = [...initialSetup.eventStream].sort((a, b) => new Date(a.timestamp).getTime() - new Date(a.timestamp).getTime());
        setGivenEvents(sortedGivenEvents); // Store raw events for visualization
        const projectedGivenState = projectEvents(sortedGivenEvents);
        
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
                           {givenEvents && <EventsVisualizer events={givenEvents} title="Voir événements initiaux" />}
                           {result.finalState && <EventsVisualizer events={result.finalState.eventStream} title="Voir événements finaux" />}
                        </div>
                         <details className="mt-4 text-xs text-muted-foreground">
                            <summary>Voir le flux d'événements final (JSON)</summary>
                            <pre className="mt-2 p-2 bg-muted rounded-md overflow-x-auto">{JSON.stringify(result.finalState?.eventStream ?? [], null, 2)}</pre>
                        </details>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
