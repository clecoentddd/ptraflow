
"use client";

import React, { useState } from 'react';
import type { AppState, AppEvent } from '../mutations/mutation-lifecycle/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { initialState, cqrsReducer } from '../mutations/mutation-lifecycle/cqrs';
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

const projectEvents = (eventStream: AppEvent[]): AppState => {
    // The reducer will handle the sorting for projections internally
    let projectedState = cqrsReducer({ ...initialState, eventStream }, { type: 'REPLAY' });
    return projectedState;
}

interface TestResult {
    pass: boolean;
    message: string;
    finalState?: AppState;
}

interface TestComponentProps {
    title: string;
    description: string;
    given: () => { eventStream: AppEvent[] };
    when: (initialState: AppState) => AppState;
    then: (finalState: AppState, toasts: typeof mockToasts) => TestResult;
}


const EventsVisualizer: React.FC<{events: AppEvent[], title: string}> = ({ events, title }) => {
    const relevantEventTypes = new Set([
        'REVENU_AJOUTE', 'DEPENSE_AJOUTEE', 'ECRITURE_SUPPRIMEE', 'ECRITURE_DATE_FIN_MODIFIEE'
    ]);

    // We DO NOT sort the event stream here to show the raw storage order.
    // The projection logic is responsible for chronological sorting.
    const chronoSortedEvents = [...events].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const findEcriturePeriodBeforeEvent = (ecritureId: string, timestamp: string): { start: Date; end: Date } | null => {
        let period: { start: Date; end: Date } | null = null;
        for (const event of chronoSortedEvents) {
            if (new Date(event.timestamp) >= new Date(timestamp)) break;
            if ('payload' in event && (event.payload as any)?.ecritureId === ecritureId) {
                if (event.type === 'REVENU_AJOUTE' || event.type === 'DEPENSE_AJOUTEE') {
                     period = {
                        start: parse((event.payload as any).dateDebut, 'MM-yyyy', new Date()),
                        end: parse((event.payload as any).dateFin, 'MM-yyyy', new Date()),
                     }
                }
                if (event.type === 'ECRITURE_DATE_FIN_MODIFIEE' && period) {
                    period.end = parse((event.payload as any).nouvelleDateFin, 'MM-yyyy', new Date());
                }
                 if (event.type === 'ECRITURE_SUPPRIMEE') {
                    period = null;
                }
            }
        }
        return period;
    }
    
    const relevantEvents = chronoSortedEvents.filter(e => relevantEventTypes.has(e.type));
    
    // 1. Find all unique ecriture IDs from the events
    const ecritureIds = Array.from(new Set(relevantEvents.flatMap(e => {
        if ('payload' in e && e.payload && typeof e.payload === 'object') {
            const payload = e.payload as any;
            if (payload.ecritureId) return [payload.ecritureId];
            if (payload.originalEcritureId) return [payload.originalEcritureId, payload.newEcritureId];
        }
        return [];
    })));

    if (ecritureIds.length === 0) return null;

    // 2. Determine the full date range to display
    const allDates: Date[] = [];
    chronoSortedEvents.forEach(e => {
         if ('payload' in e && e.payload && typeof e.payload === 'object') {
            const payload = e.payload as any;
            if (payload.dateDebut) allDates.push(parse(payload.dateDebut, 'MM-yyyy', new Date()));
            if (payload.dateFin) allDates.push(parse(payload.dateFin, 'MM-yyyy', new Date()));
            if (payload.ancienneDateFin) allDates.push(parse(payload.ancienneDateFin, 'MM-yyyy', new Date()));
            if (payload.nouvelleDateFin) allDates.push(parse(payload.nouvelleDateFin, 'MM-yyyy', new Date()));
        }
    });

    if (allDates.length < 1) return null;
    
    const validDates = allDates.filter(d => !isNaN(d.getTime()));
    if (validDates.length < 1) return null;

    const minDate = new Date(Math.min(...validDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...validDates.map(d => d.getTime())));

    if (minDate > maxDate) return null;

    const months = eachMonthOfInterval({ start: minDate, end: maxDate }).map(d => format(d, 'MM-yyyy'));

    // 3. Create a map of events by ecritureId and month
    const eventMap: Record<string, Record<string, AppEvent[]>> = {};

    for (const ecritureId of ecritureIds) {
        eventMap[ecritureId] = {};
        for (const month of months) {
            eventMap[ecritureId][month] = [];
        }
    }
    
    relevantEvents.forEach(event => {
        if (!('payload' in event) || !event.payload || typeof event.payload !== 'object' || !('ecritureId' in event.payload)) return;
        
        const payload = event.payload as any;
        const ecritureId = payload.ecritureId;

        let affectedMonths: string[] = [];
        
        try {
            if (event.type === 'REVENU_AJOUTE' || event.type === 'DEPENSE_AJOUTEE') {
                 affectedMonths = eachMonthOfInterval({ 
                    start: parse(payload.dateDebut, 'MM-yyyy', new Date()),
                    end: parse(payload.dateFin, 'MM-yyyy', new Date())
                 }).map(m => format(m, 'MM-yyyy'));
            } else if (event.type === 'ECRITURE_DATE_FIN_MODIFIEE') {
                 const oldEnd = parse(payload.ancienneDateFin, 'MM-yyyy', new Date());
                 const newEnd = parse(payload.nouvelleDateFin, 'MM-yyyy', new Date());
                 const start = oldEnd > newEnd ? new Date(newEnd.getFullYear(), newEnd.getMonth() + 1, 1) : new Date(oldEnd.getFullYear(), oldEnd.getMonth() + 1, 1);
                 const end = oldEnd > newEnd ? oldEnd : newEnd;
                 affectedMonths = eachMonthOfInterval({ start, end }).map(m => format(m, 'MM-yyyy'));
            } else if (event.type === 'ECRITURE_SUPPRIMEE') {
                const period = findEcriturePeriodBeforeEvent(ecritureId, event.timestamp);
                if (period) {
                     affectedMonths = eachMonthOfInterval(period).map(m => format(m, 'MM-yyyy'));
                }
            }

            affectedMonths.forEach(monthKey => {
                if (eventMap[ecritureId] && eventMap[ecritureId][monthKey]) {
                    eventMap[ecritureId][monthKey].push(event);
                }
            });
        } catch (e) {
            console.error("Error processing event for visualizer", event, e);
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
                                    <TableCell key={`${ecritureId}-${month}`} className="text-center font-mono align-top h-12">
                                        {eventMap[ecritureId]?.[month]?.length > 0 ? (
                                            <div className="flex flex-col gap-1 items-center">
                                                {eventMap[ecritureId][month].map(e => {
                                                    let color = 'bg-gray-500';
                                                    if (e.type.includes('AJOUTE')) color = 'bg-green-500';
                                                    if (e.type.includes('SUPPRIMEE')) color = 'bg-red-500';
                                                    if (e.type.includes('MODIFIEE')) color = 'bg-yellow-500 text-black';
                                                    return (
                                                        <div key={e.id} className={`text-white text-[10px] rounded-full px-2 py-0.5 ${color}`} title={e.type}>
                                                            {e.type.replace('ECRITURE_', '').replace('DATE_FIN_', '').split('_').map(s=>s[0]).join('')}
                                                        </div>
                                                    )
                                                })}
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
    const [finalEvents, setFinalEvents] = useState<AppEvent[] | null>(null);

    const runTest = () => {
        mockToasts.length = 0; // Clear toasts for each run

        // GIVEN: Set up the initial state by projecting past events
        const initialSetup = given();
        setGivenEvents(initialSetup.eventStream); 
        const projectedGivenState = projectEvents(initialSetup.eventStream);
        
        // WHEN: The command handler or projection logic is called
        const stateAfterWhen = when(projectedGivenState);
        
        // THEN: The result is checked
        const finalProjectedState = projectEvents(stateAfterWhen.eventStream);
        setFinalEvents(finalProjectedState.eventStream);
        
        const testResult = then(finalProjectedState, mockToasts);
        setResult({ ...testResult, finalState: finalProjectedState });
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
                           {finalEvents && <EventsVisualizer events={finalEvents} title="Voir événements finaux" />}
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

    