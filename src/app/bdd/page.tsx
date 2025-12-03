
"use client";

import React, { useEffect, useReducer, useState } from 'react';
import { CqrsProvider, useCqrs, AppState, AppCommand, cqrsReducer, initialState } from '../mutations/mutation-lifecycle/cqrs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';

// Mocked toast for testing purposes
const mockToasts: { message: string; type: 'error' | 'success' }[] = [];
const toast = {
  error: (message: string) => {
    console.error("MOCK TOAST (Error):", message);
    mockToasts.push({ message, type: 'error' });
  },
};

// We need to override the handler to use our mock toast
import { createDroitsMutationCommandHandler as originalCreateDroitsHandler } from '../mutations/create-mutation/handler';
function createDroitsMutationCommandHandler(state: AppState, command: AppCommand): AppState {
    const existingMutation = state.mutations.find(m => m.status === 'OUVERTE' || m.status === 'EN_COURS');
    if (existingMutation && command.type === 'CREATE_DROITS_MUTATION') {
        toast.error(`La mutation ${existingMutation.id} est déjà en cours.`);
        return state;
    }
    if (command.type === 'CREATE_DROITS_MUTATION') {
        // This is a simplified version of the original handler for test predictability
        const mutationId = `test-mut-${crypto.randomUUID()}`;
        const event = {
            id: crypto.randomUUID(),
            type: 'DROITS_MUTATION_CREATED',
            mutationId,
            timestamp: new Date().toISOString(),
            payload: { mutationType: 'DROITS' },
        };
        return { ...state, eventStream: [event, ...state.eventStream] };
    }
    return state;
}

// Custom reducer for tests that uses the mocked command handler
const testReducer = (state: AppState, command: AppCommand): AppState => {
    let newState = state;
     if (command.type === 'CREATE_DROITS_MUTATION') {
         newState = createDroitsMutationCommandHandler(state, command);
    } else {
        newState = cqrsReducer(state, command);
    }

    // Rebuild state from events
    let rebuiltState: AppState = { ...initialState, eventStream: newState.eventStream };
    const sortedEvents = [...newState.eventStream].reverse();

    for (const event of sortedEvents) {
        rebuiltState = cqrsReducer(rebuiltState, { type: event.type, ...event } as any);
    }
    return rebuiltState;
};


interface TestComponentProps {
    title: string;
    description: string;
    given: () => AppState;
    when: (dispatch: React.Dispatch<AppCommand>, state: AppState) => void;
    then: (state: AppState, toasts: typeof mockToasts) => { pass: boolean; message: string };
}

const TestComponent: React.FC<TestComponentProps> = ({ title, description, given, when, then }) => {
    const [state, dispatch] = useReducer(cqrsReducer, initialState, given);
    const [hasRun, setHasRun] = useState(false);
    const [result, setResult] = useState<{ pass: boolean; message: string } | null>(null);

    const runTest = () => {
        mockToasts.length = 0; // Clear toasts for each run
        when(dispatch, state);
        setHasRun(true);
    };

    useEffect(() => {
        if (hasRun) {
            // We need to wait a tick for the state to update
            setTimeout(() => {
                 const testResult = then(state, mockToasts);
                 setResult(testResult);
            }, 0);
        }
    }, [state, hasRun, then]);

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
                        <details className="mt-4 text-xs text-muted-foreground">
                            <summary>Voir l'état final</summary>
                            <pre className="mt-2 p-2 bg-muted rounded-md overflow-x-auto">{JSON.stringify(state, null, 2)}</pre>
                        </details>
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
        description="Etant qu'une mutation est créée, quand l'utisateur crée une autre mutation, alors une erreur 'mutation id ... est déjà en cours' est affichée."
        given={() => {
            const mutationId = 'mut-1';
            const event = { id: 'evt-1', mutationId, type: 'DROITS_MUTATION_CREATED', timestamp: new Date().toISOString(), payload: { mutationType: 'DROITS' } };
            const state = { ...initialState, eventStream: [event] };
            return cqrsReducer(initialState, { type: 'CREATE_DROITS_MUTATION', ...event} as any);
        }}
        when={(dispatch) => {
            dispatch({ type: 'CREATE_DROITS_MUTATION' });
        }}
        then={(state, toasts) => {
            const pass = state.mutations.length === 1 && toasts.some(t => t.message.includes('est déjà en cours'));
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
        description="Etant qu'une mutation est créée et validée, quand l'utilisateur crée une mutation, la nouvelle mutation est créée."
        given={() => {
            let state = initialState;
            // GIVEN a mutation is created
            state = cqrsReducer(state, { type: 'CREATE_DROITS_MUTATION'});
            const mutationId = state.mutations[0].id;
            // AND the mutation is validated
            state = cqrsReducer(state, { type: 'SUSPEND_PAIEMENTS', payload: { mutationId } });
            state = cqrsReducer(state, { type: 'ANALYZE_DROITS', payload: { mutationId } });
            state = cqrsReducer(state, { type: 'VALIDATE_MUTATION', payload: { mutationId } });
            return state;
        }}
        when={(dispatch) => {
            // WHEN a new mutation is created
            dispatch({ type: 'CREATE_DROITS_MUTATION' });
        }}
        then={(state) => {
            const pass = state.mutations.length === 2 && state.mutations[0].status === 'OUVERTE';
            return {
                pass,
                message: pass ? 'Succès: Une nouvelle mutation a bien été créée.' : 'Échec: La nouvelle mutation n\'a pas pu être créée.',
            };
        }}
    />
);


export default function BDDPage() {
    return (
        <div className="p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold">Tests BDD - MutationFlow</h1>
                <p className="text-muted-foreground">Cette page exécute les scénarios de test pour valider les règles métier.</p>
            </header>
            <main className="space-y-6">
                <BDDTest1 />
                <BDDTest2 />
            </main>
        </div>
    );
}
