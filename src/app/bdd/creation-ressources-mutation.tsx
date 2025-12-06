
"use client";

import React from 'react';
import type { AppEvent } from '../mutations/mutation-lifecycle/domain';
import { TestComponent, mockToast } from '../mutations/bdd/test-harness';
import { createRessourcesMutationCommandHandler } from '../mutations/create-ressources-mutation/handler';
import { cqrsReducer } from '../mutations/mutation-lifecycle/cqrs';
import type { PlanPaiementValideEvent } from '../mutations/valider-plan-paiement/event';

// Definition of Test for Resource Mutation Creation
export const BDDTestCreationRessources: React.FC = () => (
    <TestComponent
        title="Test Création Mutation Ressources sans Période de Droits"
        description="Etant donné qu'aucune période de droits n'a été validée, quand l'utilisateur tente de créer une mutation de ressources, alors une erreur 'Il n'y a pas de périodes de droits validées' est affichée et aucun nouvel événement n'est créé."
        given={() => {
            // GIVEN: No events in the stream
            return { eventStream: [] };
        }}
        when={(initialState) => {
            let state = initialState;
            const mockDispatch = (event: AppEvent) => {
                state = cqrsReducer(state, { type: 'DISPATCH_EVENT', event });
            }
            // WHEN: we call the command handler directly with the command and our mock toast
            createRessourcesMutationCommandHandler(initialState, mockDispatch, { toast: mockToast });
            return state;
        }}
        then={(state, toasts) => {
            // THEN: we check that NO new event was created and a toast was shown.
            const noEventCreated = state.eventStream.length === 0;
            const errorToastShown = toasts.some(t => t.message.includes("Il n'y a pas de périodes de droits validées"));
            const pass = noEventCreated && errorToastShown;
            
            return {
                pass,
                message: pass 
                    ? 'Succès: La création a été bloquée et une erreur a été affichée.' 
                    : `Échec: Le test a échoué. ${!noEventCreated ? 'Un événement a été créé.' : ''} ${!errorToastShown ? 'Aucun message d\'erreur correct n\'a été affiché.' : ''}`,
            };
        }}
    />
);

// Definition of Test 2 for Resource Mutation Creation
export const BDDTestCreationRessourcesAvecPeriode: React.FC = () => (
    <TestComponent
        title="Test Création Mutation Ressources avec Période de Droits validée"
        description="Etant donné qu'une période de droits a été validée, quand l'utilisateur crée une mutation de ressources, alors un événement RESSOURCES_MUTATION_CREATED est créé."
        given={() => {
            const event: PlanPaiementValideEvent = { 
                id: 'evt-1', 
                mutationId: 'mut-droits', 
                type: 'PLAN_PAIEMENT_VALIDE', 
                timestamp: new Date().toISOString(), 
                payload: { userEmail: 'test', dateDebut: '01-2025', dateFin: '12-2025' } 
            };
            return { eventStream: [event] };
        }}
        when={(initialState) => {
            let state = initialState;
            const mockDispatch = (event: AppEvent) => {
                state = cqrsReducer(state, { type: 'DISPATCH_EVENT', event });
            }
            createRessourcesMutationCommandHandler(initialState, mockDispatch, { toast: mockToast });
            return state;
        }}
        then={(state, toasts) => {
            const eventCreated = state.eventStream.length === 2 && state.eventStream[0].type === 'RESSOURCES_MUTATION_CREATED';
            const noErrorToast = !toasts.some(t => t.message.includes("Il n'y a pas de périodes de droits validées"));
            const pass = eventCreated && noErrorToast;
            
            return {
                pass,
                message: pass 
                    ? 'Succès: Un événement RESSOURCES_MUTATION_CREATED a bien été créé.' 
                    : `Échec: Le test a échoué. ${!eventCreated ? 'L\'événement n\'a pas été créé.' : ''} ${!noErrorToast ? 'Un message d\'erreur a été affiché à tort.' : ''}`,
            };
        }}
    />
);
