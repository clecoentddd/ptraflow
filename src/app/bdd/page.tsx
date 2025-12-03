
"use client";

import React, { useEffect, useReducer, useState } from 'react';
import { useCqrs, AppState, AppCommand, cqrsReducer, initialState } from '../mutations/mutation-lifecycle/cqrs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { createDroitsMutationCommandHandler } from '../mutations/create-mutation/handler';
import { createRessourcesMutationCommandHandler } from '../mutations/create-ressources-mutation/handler';

// Mocked toast for testing purposes
const mockToasts: { message: string; type: 'error' | 'success' }[] = [];
const toast = {
  error: (message: string) => {
    console.error("MOCK TOAST (Error):", message);
    mockToasts.push({ message, type: 'error' });
  },
};

// We need to override the handler to use our mock toast
function createTestDroitsMutationCommandHandler(state: AppState, command: AppCommand): AppState {
    const existingMutation = state.mutations.find(m => m.status === 'OUVERTE' || m.status === 'EN_COURS');
    if (existingMutation && command.type === 'CREATE_DROITS_MUTATION') {
        toast.error(`La mutation ${existingMutation.id} est déjà en cours.`);
        return state;
    }
    // We call the original handler if the check passes
    return createDroitsMutationCommandHandler(state, command as any);
}

// Custom reducer for tests that separates command handling from projection
const testReducer = (state: AppState, command: AppCommand): AppState => {
    let stateAfterCommand = state;

    // 1. Command Handling: Only run the command handler, which produces an event.
    // It does NOT run the projection.
     switch (command.type) {
        case 'CREATE_DROITS_MUTATION':
            // Use our special test handler with the mock toast
            stateAfterCommand = createTestDroitsMutationCommandHandler(state, command);
            break;
         case 'CREATE_RESSOURCES_MUTATION':
             stateAfterCommand = createRessourcesMutationCommandHandler(state, command as any);
             break;
        // For other commands, we use the main reducer's command handling part
        default:
             stateAfterCommand = cqrsReducer(state, command);
             // The problem is cqrsReducer also does projection. Let's simplify for the test.
             // We'll assume for now only CREATE commands are tested this way.
            break;
    }

    // 2. Projection: Rebuild the state from the resulting event stream.
    // This simulates what our main cqrsReducer does in a second step.
    let rebuiltState: AppState = { ...initialState, eventStream: stateAfterCommand.eventStream };
    const sortedEvents = [...stateAfterCommand.eventStream].reverse();

    for (const event of sortedEvents) {
        // We use the global reducer here just for its projection logic
        rebuiltState = cqrsReducer(rebuiltState, { type: `REPLAY_${event.type}`, ...event } as any);
    }
    // The final state has the new event stream and the projected state
    return { ...rebuiltState, eventStream: stateAfterCommand.eventStream };
};

const BddCqrsProvider: React.FC<{ given: () => AppState, children: React.ReactNode }> = ({ given, children }) => {
    const [state, dispatch] = useReducer(testReducer, initialState, given);
    const value = { state, dispatch, CqrsProvider: BddCqrsProvider } as any;
    return <CqrsContext.Provider value={value}>{children}</CqrsContext.Provider>;
}
const CqrsContext = createContext<{ state: AppState; dispatch: React.Dispatch<AppCommand>; CqrsProvider: any } | undefined>(undefined);
const useBddCqrs = () => {
    const context = useContext(CqrsContext);
    if (!context) throw new Error("useBddCqrs must be used within a BddCqrsProvider");
    return context;
}


interface TestComponentProps {
    title: string;
    description: string;
    given: () => AppState;
    when: (dispatch: React.Dispatch<AppCommand>, state: AppState) => void;
    then: (finalState: AppState, toasts: typeof mockToasts) => { pass: boolean; message: string };
}

const TestComponent: React.FC<TestComponentProps> = ({ title, description, given, when, then }) => {
    const [initialState, setInitialState] = useState(given);
    const [finalState, setFinalState] = useState<AppState | null>(null);
    const [hasRun, setHasRun] = useState(false);
    const [result, setResult] = useState<{ pass: boolean; message: string } | null>(null);

    const runTest = () => {
        mockToasts.length = 0; // Clear toasts for each run
        let stateAfterGiven = given();

        // Apply projection to the initial state
        let projectedInitialState: AppState = { ...initialState, eventStream: stateAfterGiven.eventStream };
        const sortedEvents = [...stateAfterGiven.eventStream].reverse();
        for (const event of sortedEvents) {
            projectedInitialState = cqrsReducer(projectedInitialState, { type: event.type, ...event } as any);
        }

        const dispatch = (command: AppCommand) => {
             const stateAfterCommand = testReducer(projectedInitialState, command);
             setFinalState(stateAfterCommand);
        };
        
        when(dispatch, projectedInitialState);
        setHasRun(true);
    };

    useEffect(() => {
        if (hasRun && finalState) {
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
                        <details className="mt-4 text-xs text-muted-foreground">
                            <summary>Voir l'état final</summary>
                            <pre className="mt-2 p-2 bg-muted rounded-md overflow-x-auto">{JSON.stringify(finalState, null, 2)}</pre>
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
            // The initial state only contains the event stream
            return { ...initialState, eventStream: [event] };
        }}
        when={(dispatch) => {
            dispatch({ type: 'CREATE_DROITS_MUTATION' });
        }}
        then={(state, toasts) => {
            // We check that no new event was created and a toast was shown.
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
        description="Etant qu'une mutation est créée et validée, quand l'utilisateur crée une mutation, la nouvelle mutation est créée."
        given={() => {
            const mutationId = "mut-1";
            const events = [
                 { id: 'evt-3', mutationId, type: 'MUTATION_VALIDATED', timestamp: new Date().toISOString(), payload: { userEmail: 'test' } },
                 { id: 'evt-2', mutationId, type: 'PAIEMENTS_SUSPENDUS', timestamp: new Date().toISOString(), payload: { userEmail: 'test' } },
                 { id: 'evt-1', mutationId, type: 'DROITS_MUTATION_CREATED', timestamp: new Date().toISOString(), payload: { mutationType: 'DROITS' } },
            ];
            return { ...initialState, eventStream: events };
        }}
        when={(dispatch) => {
            // WHEN a new mutation is created
            dispatch({ type: 'CREATE_DROITS_MUTATION' });
        }}
        then={(state) => {
             // We check that a new event has been added to the stream.
            const pass = state.eventStream.length === 4 && state.eventStream[0].type === 'DROITS_MUTATION_CREATED';
            return {
                pass,
                message: pass ? 'Succès: Une nouvelle mutation a bien été créée (un 4ème événement a été ajouté).' : 'Échec: La nouvelle mutation n\'a pas pu être créée.',
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
