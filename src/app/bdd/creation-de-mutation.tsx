
"use client";

import React, { useState } from 'react';
import type { AppState, AppCommand, AppEvent } from '../mutations/mutation-lifecycle/cqrs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { createDroitsMutationCommandHandler } from '../mutations/create-mutation/handler';
import { initialState, cqrsReducer } from '../mutations/mutation-lifecycle/cqrs';

// Import event types for correct test data creation
import type { DroitsMutationCreatedEvent } from '../mutations/create-mutation/event';
import type { PaiementsSuspendusEvent } from '../mutations/suspend-paiements/event';
import type { MutationValidatedEvent } from '../mutations/validate-mutation/event';

// Mocked toast for testing purposes
const mockToasts: { message: string; type: 'error' | 'success' }[] = [];
const toast = {
  error: (message: string) => {
    console.error("MOCK TOAST (Error):", message);
    mockToasts.push({ message, type: 'error' });
  },
};

// We need to override the handler to use our mock toast.
// The original handler imported the real 'react-hot-toast'.
function createTestDroitsMutationCommandHandler(state: AppState, command: AppCommand): AppState {
    if (command.type !== 'CREATE_DROITS_MUTATION') return state;

    const existingMutation = state.mutations.find(m => m.status === 'OUVERTE' || m.status === 'EN_COURS');
    if (existingMutation) {
        toast.error(`La mutation ${existingMutation.id} est déjà en cours.`);
        return state;
    }
    const mutationId = crypto.randomUUID();
    const event: DroitsMutationCreatedEvent = {
        id: crypto.randomUUID(),
        type: 'DROITS_MUTATION_CREATED',
        mutationId,
        timestamp: new Date().toISOString(),
        payload: { mutationType: 'DROITS' },
    };
    return { ...state, eventStream: [event, ...state.eventStream] };
}

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

const TestComponent: React.FC<TestComponentProps> = ({ title, description, given, when, then }) => {
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


// Definition of Test 1
export const BDDTest1: React.FC = () => (
    <TestComponent
        title="Test 1: Création de mutation concurrente"
        description="Etant donnée qu'une mutation est déjà créée, quand l'utisateur tente de créer une autre mutation, alors une erreur 'mutation ... est déjà en cours' est affichée et aucun nouvel événement n'est créé."
        given={() => {
            const mutationId = 'mut-1';
            const event: DroitsMutationCreatedEvent = { id: 'evt-1', mutationId, type: 'DROITS_MUTATION_CREATED', timestamp: new Date().toISOString(), payload: { mutationType: 'DROITS' } };
            return { eventStream: [event] };
        }}
        when={(initialState) => {
            // WHEN: we call the command handler directly with the command
            return createTestDroitsMutationCommandHandler(initialState, { type: 'CREATE_DROITS_MUTATION' });
        }}
        then={(state, toasts) => {
            // THEN: we check that NO new event was created and a toast was shown.
            const pass = state.eventStream.length === 1 && toasts.some(t => t.message.includes('est déjà en cours'));
            return {
                pass,
                message: pass ? 'Succès: La seconde mutation a été bloquée et une erreur a été affichée.' : 'Échec: La seconde mutation a été créée ou aucune erreur n\'a été affichée.',
            };
        }}
    />
);

// Definition of Test 2
export const BDDTest2: React.FC = () => (
     <TestComponent
        title="Test 2: Création de mutation après validation"
        description="Etant donnée qu'une mutation est créée et validée, quand l'utilisateur crée une nouvelle mutation, alors la nouvelle mutation est bien créée."
        given={() => {
            const mutationId = "mut-1";
            // The events are in reverse chronological order (as in the real app state)
            const events: AppEvent[] = [
                 { id: 'evt-3', mutationId, type: 'MUTATION_VALIDATED', timestamp: new Date().toISOString(), payload: { userEmail: 'test' } } as MutationValidatedEvent,
                 { id: 'evt-2', mutationId, type: 'PAIEMENTS_SUSPENDUS', timestamp: new Date().toISOString(), payload: { userEmail: 'test' } } as PaiementsSuspendusEvent,
                 { id: 'evt-1', mutationId, type: 'DROITS_MUTATION_CREATED', timestamp: new Date().toISOString(), payload: { mutationType: 'DROITS' } } as DroitsMutationCreatedEvent,
            ];
            return { eventStream: events };
        }}
        when={(initialState) => {
             // WHEN: we call the command handler directly with the command
            return createDroitsMutationCommandHandler(initialState, { type: 'CREATE_DROITS_MUTATION' });
        }}
        then={(state) => {
             // THEN we check that a new event has been added to the stream.
            const pass = state.eventStream.length === 4 && state.eventStream[0].type === 'DROITS_MUTATION_CREATED';
            return {
                pass,
                message: pass ? 'Succès: Une nouvelle mutation a bien été créée (un 4ème événement a été ajouté au flux).' : 'Échec: La nouvelle mutation n\'a pas pu être créée.',
            };
        }}
    />
);
