
"use client";

import React from 'react';
import type { AppEvent } from '../mutations/mutation-lifecycle/domain';
import { createDroitsMutationCommandHandler } from '../mutations/create-mutation/handler';
import { TestComponent, mockToast } from '../mutations/bdd/test-harness';
import { cqrsReducer } from '../mutations/mutation-lifecycle/cqrs';

// Import event types for correct test data creation
import type { DroitsMutationCreatedEvent } from '../mutations/create-mutation/event';
import type { PaiementsSuspendusEvent } from '../mutations/suspend-paiements/event';
import type { PlanDeCalculValideEvent } from '../mutations/valider-plan-paiement/event';


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
            let state = initialState;
            // WHEN: we call the command handler directly with the command and our mock toast
            // The handler now dispatches an event, so we create a mock dispatch function
            const mockDispatch = (event: AppEvent) => {
                // The reducer will apply the event and update the state
                state = cqrsReducer(state, { type: 'DISPATCH_EVENT', event });
            }
            createDroitsMutationCommandHandler(initialState, mockDispatch, { toast: mockToast });
            return state;
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
                 { id: 'evt-3', mutationId, type: 'PLAN_DE_CALCUL_VALIDE', timestamp: new Date().toISOString(), payload: { userEmail: 'test' } } as any,
                 { id: 'evt-2', mutationId, type: 'PAIEMENTS_SUSPENDUS', timestamp: new Date().toISOString(), payload: { userEmail: 'test' } } as PaiementsSuspendusEvent,
                 { id: 'evt-1', mutationId, type: 'DROITS_MUTATION_CREATED', timestamp: new Date().toISOString(), payload: { mutationType: 'DROITS' } } as DroitsMutationCreatedEvent,
            ];
            return { eventStream: events };
        }}
        when={(initialState) => {
            let state = initialState;
             // WHEN: we call the command handler directly with the command
            const mockDispatch = (event: AppEvent) => {
                state = cqrsReducer(state, { type: 'DISPATCH_EVENT', event });
            }
            createDroitsMutationCommandHandler(initialState, mockDispatch);
            return state;
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
