
"use client";

import React from 'react';
import { TestComponent, mockToast } from './test-harness';
import { createRessourcesMutationCommandHandler } from '../mutations/create-ressources-mutation/handler';
import { queryValidatedPeriods } from '../mutations/projection-periodes-de-droits/projection';

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
            // WHEN: we call the command handler directly with the command and our mock toast
            return createRessourcesMutationCommandHandler(initialState, { type: 'CREATE_RESSOURCES_MUTATION' }, { toast: mockToast });
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
