
"use client";

import React, { createContext, useContext, useReducer, type Dispatch } from 'react';

// Importation des types de commandes, événements et état depuis le domaine
import type { AppCommand, AppEvent, AppState } from './domain';

// Importation des command handlers (seront appelés différemment maintenant)
import { analyzeDroitsCommandHandler } from '../analyze-droits/handler';
import { validateMutationCommandHandler } from '../validate-mutation/handler';
import { autoriserModificationDroitsCommandHandler } from '../autoriser-modification-des-droits/handler';
import { autoriserModificationRessourcesCommandHandler } from '../autoriser-modification-des-ressources/handler';
import { ajouterRevenuCommandHandler } from '../ecritures/ajouter-revenu/handler';
import { validerModificationRessourcesCommandHandler } from '../valider-modification-ressources/handler';
import { ajouterDepenseCommandHandler } from '../ecritures/ajouter-depense/handler';
import { supprimerEcritureCommandHandler } from '../ecritures/supprimer-ecriture/handler';
import { mettreAJourEcritureCommandHandler } from '../ecritures/mettre-a-jour-ecriture/handler';
import { validerPlanCalculCommandHandler } from '../calculer-plan/handler';

// Importation des logiques de projection
import { validatedPeriodsProjectionReducer, initialValidatedPeriodsState } from '../projection-periodes-de-droits/projection';
import { mutationsProjectionReducer, initialMutationsState } from '../projection-mutations/projection';
import { todolistProjectionReducer, initialTodolistState } from '../projection-todolist/projection';
import { ecrituresProjectionReducer, initialEcrituresState } from '../projection-ecritures/projection';
import { journalProjectionReducer, initialJournalState } from '../projection-journal/projection';
import { planCalculProjectionReducer, initialPlanCalculState } from '../projection-plan-calcul/projection';


// 1. INITIAL STATE
// ==================
export const initialState: AppState = {
  eventStream: [],
  ...initialValidatedPeriodsState,
  ...initialMutationsState,
  ...initialTodolistState,
  ...initialEcrituresState,
  ...initialJournalState,
  ...initialPlanCalculState,
};

// 2. PROJECTION LOGIC (Le "Subscriber")
// ======================================

// Cette fonction applique un SEUL événement à toutes les projections.
function applyEventToProjections(state: AppState, event: AppEvent): AppState {
    let nextState = state;
    
    // Chaque projection met à jour sa propre slice de l'état.
    nextState = mutationsProjectionReducer(nextState, event);
    nextState = todolistProjectionReducer(nextState, event);
    nextState = validatedPeriodsProjectionReducer(nextState, event);
    nextState = ecrituresProjectionReducer(nextState, event);
    nextState = planCalculProjectionReducer(nextState, event);
    // Le journal est calculé à la fin, car il peut dépendre d'autres projections.
    nextState = journalProjectionReducer(nextState, event);
    
    return nextState;
}

// Cette fonction reconstruit l'état complet à partir du flux d'événements.
// Utile pour l'hydratation initiale ou les tests.
function rebuildStateFromEvents(events: AppState['eventStream']): AppState {
    let state: AppState = { ...initialState, eventStream: events };
    // Les événements doivent être traités par ordre chronologique (du plus ancien au plus récent)
    const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (const event of sortedEvents) {
        state = applyEventToProjections(state, event);
    }
    // After all individual events are projected, we run a final projection step
    // for projections that depend on the final state of other projections (like the journal).
    state = journalProjectionReducer(state, { type: 'REPLAY_COMPLETE' });
    return state;
}

// 3. AGGREGATE REDUCER (Le "Bus" d'événements + Routeur de commandes legacy)
// ===========================================================================

export function cqrsReducer(state: AppState, action: AppCommand): AppState {

    // Nouveau pattern : on reçoit directement un événement à dispatcher
    if (action.type === 'DISPATCH_EVENT') {
        const newState = {
            ...state,
            eventStream: [action.event, ...state.eventStream]
        };
        // On reconstruit l'état complet pour garantir la cohérence entre les projections.
        return rebuildStateFromEvents(newState.eventStream);
    }

    // --- Legacy Command Handling ---
    let newStateWithEvents: AppState = state;
    switch (action.type) {
        case 'CREATE_DROITS_MUTATION':
        case 'CREATE_RESSOURCES_MUTATION':
        case 'SUSPEND_PAIEMENTS':
            // Ces cas sont gérés par le nouveau flux Pub/Sub.
            return state; 
        case 'AUTORISER_MODIFICATION_DROITS':
            newStateWithEvents = autoriserModificationDroitsCommandHandler(state, action);
            break;
        case 'AUTORISER_MODIFICATION_RESSOURCES':
            newStateWithEvents = autoriserModificationRessourcesCommandHandler(state, action);
            break;
        case 'ANALYZE_DROITS':
            newStateWithEvents = analyzeDroitsCommandHandler(state, action);
            break;
        case 'VALIDATE_MUTATION':
            newStateWithEvents = validateMutationCommandHandler(state, action);
            break;
        case 'VALIDER_PLAN_CALCUL':
            newStateWithEvents = validerPlanCalculCommandHandler(state, action);
            break;
        case 'AJOUTER_REVENU':
            newStateWithEvents = ajouterRevenuCommandHandler(state, action);
            break;
        case 'AJOUTER_DEPENSE':
            newStateWithEvents = ajouterDepenseCommandHandler(state, action);
            break;
        case 'VALIDER_MODIFICATION_RESSOURCES':
            newStateWithEvents = validerModificationRessourcesCommandHandler(state, action);
            break;
        case 'SUPPRIMER_ECRITURE':
             newStateWithEvents = supprimerEcritureCommandHandler(state, action);
             break;
        case 'METTRE_A_JOUR_ECRITURE':
             newStateWithEvents = mettreAJourEcritureCommandHandler(state, action);
             break;
        case 'REPLAY': // Uniquement pour les tests BDD
             return applyEventToProjections({ ...state, eventStream: [action.event, ...state.eventStream] }, action.event);
        case 'REPLAY_COMPLETE': // Uniquement pour les tests BDD
            return rebuildStateFromEvents(state.eventStream);
        default:
            return state;
    }
    
    // Si de nouveaux événements ont été ajoutés par le legacy system, on reconstruit tout.
    if (newStateWithEvents.eventStream.length > state.eventStream.length) {
        return rebuildStateFromEvents(newStateWithEvents.eventStream);
    }

    return newStateWithEvents;
}


// 4. CONTEXT & PROVIDER
// =======================
const CqrsContext = createContext<{ state: AppState; dispatchEvent: (event: AppEvent | AppCommand) => void; } | undefined>(undefined);

export function CqrsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cqrsReducer, initialState);

  // Wrapper `dispatch` pour le nouveau pattern.
  // Les composants UI n'appelleront que cette fonction.
  const dispatchEvent = (eventOrCommand: AppEvent | AppCommand) => {
    if ('type' in eventOrCommand && 'mutationId' in eventOrCommand && 'id' in eventOrCommand) {
        // C'est un événement
        dispatch({ type: 'DISPATCH_EVENT', event: eventOrCommand as AppEvent });
    } else {
        // C'est une commande (legacy ou test)
        dispatch(eventOrCommand as AppCommand);
    }
  };

  return (
    <CqrsContext.Provider value={{ state, dispatchEvent }}>
      {children}
    </CqrsContext.Provider>
  );
}

// 5. HOOK
// =========
export function useCqrs() {
  const context = useContext(CqrsContext);
  if (context === undefined) {
    throw new Error('useCqrs must be used within a CqrsProvider');
  }
  return context;
}

    