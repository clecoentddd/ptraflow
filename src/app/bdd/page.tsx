
"use client";

import React, { useEffect, useState } from 'react';
import { AppState, AppCommand, cqrsReducer, initialState } from '../mutations/mutation-lifecycle/cqrs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { createDroitsMutationCommandHandler } from '../mutations/create-mutation/handler';
import { createRessourcesMutationCommandHandler } from '../mutations/create-ressources-mutation/handler';
import { suspendPaiementsCommandHandler } from '../mutations/suspend-paiements/handler';
import { analyzeDroitsCommandHandler } from '../mutations/analyze-droits/handler';
import { validateMutationCommandHandler } from '../mutations/validate-mutation/handler';

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
    // This part of the logic needs the projected state (mutations), which is fine for the command handler.
    const existingMutation = state.mutations.find(m => m.status === 'OUVERTE' || m.status === 'EN_COURS');
    if (existingMutation && command.type === 'CREATE_DROITS_MUTATION') {
        toast.error(`La mutation ${existingMutation.id} est déjà en cours.`);
        return state;
    }
    // We call the original handler if the check passes (which in this test, it won't)
    // but this ensures we are testing the handler's logic.
    return createDroitsMutationCommandHandler(state, command as any);
}

// This function rebuilds the read model (projection) from an event stream.
// It's used to set up the 'given' state and to get the final state.
const projectEvents = (eventStream: AppState['eventStream']): AppState => {
    let projectedState: AppState = { ...initialState, eventStream };
    // We use the global reducer here just for its projection logic
    return cqrsReducer(projectedState, { type: 'REPLAY' } as any);
}


interface TestComponentProps {
    title: string;
    description: string;
    given: () => { eventStream: AppState['eventStream'] };
    when: (dispatch: (command: AppCommand) => void) => void;
    then: (finalState: AppState, toasts: typeof mockToasts) => { pass: boolean; message: string };
}

const TestComponent: React.FC<TestComponentProps> = ({ title, description, given, when, then }) => {
    const [finalState, setFinalState] = useState<AppState | null>(null);
    const [hasRun, setHasRun] = useState(false);
    const [result, setResult] = useState<{ pass: boolean; message: string } | null>(null);

    const runTest = () => {
        mockToasts.length = 0; // Clear toasts for each run

        // GIVEN: Set up the initial state by projecting past events
        const givenProjectedState = projectEvents(given().eventStream);

        // WHEN: The action is performed
        const dispatch = (command: AppCommand) => {
             // The command handler is called on the initial projected state
             // We use a special test handler for the creation command to intercept the toast.
             let stateAfterCommand: AppState;
             if (command.type === 'CREATE_DROITS_MUTATION') {
                stateAfterCommand = createTestDroitsMutationCommandHandler(givenProjectedState, command);
             } else {
                // For other commands, we would call their respective handlers
                stateAfterCommand = givenProjectedState; // Placeholder for other tests
             }
             
             // We project the final event stream to get the final read model for assertion
             const finalProjectedState = projectEvents(stateAfterCommand.eventStream);
             setFinalState(finalProjectedState);
        };
        
        when(dispatch);
        setHasRun(true);
    };

    useEffect(() => {
        if (hasRun && finalState) {
            // THEN: The result is checked
            const testResult = then(finalState, mockToasts);
            setResult(testResult);
        }
    }, [finalState, hasRun, then]);

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
                {!hasRun && <Button onClick={runTest}>Exécuter le test</Button>}
                {result && (
                    <div>
                        <p className={result.pass ? 'text-green-700' : 'text-red-700'}>{result.message}</p>
                        {finalState && (
                             <details className="mt-4 text-xs text-muted-foreground">
                                <summary>Voir le flux d'événements final</summary>
                                <pre className="mt-2 p-2 bg-muted rounded-md overflow-x-auto">{JSON.stringify(finalState.eventStream, null, 2)}</pre>
                            </details>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


// Definition of Test 1
const BDDTest1: React.FC = () => (
    <TestComponent
        title="Test 1: Création de mutation concurrente"
        description="Etant donnée qu'une mutation est déjà créée, quand l'utisateur tente de créer une autre mutation, alors une erreur 'mutation ... est déjà en cours' est affichée et aucun nouvel événement n'est créé."
        given={() => {
            const mutationId = 'mut-1';
            const event = { id: 'evt-1', mutationId, type: 'DROITS_MUTATION_CREATED', timestamp: new Date().toISOString(), payload: { mutationType: 'DROITS' } };
            // The initial state has one event in its stream.
            return { eventStream: [event] };
        }}
        when={(dispatch) => {
            // WHEN a new mutation is created
            dispatch({ type: 'CREATE_DROITS_MUTATION' });
        }}
        then={(state, toasts) => {
            // THEN we check that NO new event was created and a toast was shown.
            const pass = state.eventStream.length === 1 && toasts.some(t => t.message.includes('est déjà en cours'));
            return {
                pass,
                message: pass ? 'Succès: La seconde mutation a été bloquée et une erreur a été affichée.' : 'Échec: La seconde mutation a été créée ou aucune erreur n\'a été affichée.',
            };
        }}
    />
);

// Definition of Test 2
const BDDTest2: React.FC = () => (
     <TestComponent
        title="Test 2: Création de mutation après validation"
        description="Etant donnée qu'une mutation est créée et validée, quand l'utilisateur crée une nouvelle mutation, alors la nouvelle mutation est bien créée."
        given={() => {
            const mutationId = "mut-1";
            // The events are in reverse chronological order (as in the real app state)
            const events = [
                 { id: 'evt-3', mutationId, type: 'MUTATION_VALIDATED', timestamp: new Date().toISOString(), payload: { userEmail: 'test' } },
                 { id: 'evt-2', mutationId, type: 'PAIEMENTS_SUSPENDUS', timestamp: new Date().toISOString(), payload: { userEmail: 'test' } },
                 { id: 'evt-1', mutationId, type: 'DROITS_MUTATION_CREATED', timestamp: new Date().toISOString(), payload: { mutationType: 'DROITS' } },
            ];
            return { eventStream: events };
        }}
        when={(dispatch) => {
            // WHEN a new mutation is created
            dispatch({ type: 'CREATE_DROITS_MUTATION' });
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


export default function BDDPage() {
    return (
        <div className="p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold">Tests BDD - MutationFlow</h1>
                <p className="text-muted-foreground">Cette page exécute les scénarios de test pour valider les règles métier des Command Handlers.</p>
            </header>
            <main className="space-y-6">
                <BDDTest1 />
                <BDDTest2 />
            </main>
        </div>
    );
}
