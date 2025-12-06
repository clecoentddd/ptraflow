
"use client";

import React, { createContext, useContext, useReducer, type Dispatch } from 'react';

// Importation des types de commandes, événements et état depuis le domaine
import type { AppCommand, AppEvent, AppState } from './domain';

// Importation des command handlers
import { createDroitsMutationCommandHandler } from '../create-mutation/handler';
import { createRessourcesMutationCommandHandler } from '../create-ressources-mutation/handler';
import { suspendPaiementsCommandHandler } from '../suspend-paiements/handler';
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

// This function applies ONE event to all projections that need to react.
function applyEventToProjections(state: AppState, event: AppEvent): AppState {
    let nextState = state;
    
    // Each projection updates its own slice of the state.
    nextState = mutationsProjectionReducer(nextState, event);
    nextState = todolistProjectionReducer(nextState, event);
    nextState = validatedPeriodsProjectionReducer(nextState, event);
    nextState = ecrituresProjectionReducer(nextState, event);
    nextState = planCalculProjectionReducer(nextState, event);
    
    return nextState;
}

// This function rebuilds the complete state from the event stream.
// It's the core of ensuring consistency.
function rebuildStateFromEvents(events: AppState['eventStream']): AppState {
    const sortedStreamForStorage = [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    let state: AppState = { ...initialState, eventStream: sortedStreamForStorage };
    
    // For projections, events must be processed in chronological order (oldest to newest)
    const sortedEventsForProjection = [...sortedStreamForStorage].reverse();

    for (const event of sortedEventsForProjection) {
        state = applyEventToProjections(state, event);
    }
    // After all individual events are projected, run a final projection step
    // for projections that depend on the final state of other projections (like the journal).
    state = journalProjectionReducer(state, { type: 'REPLAY_COMPLETE' });
    return state;
}

// 3. AGGREGATE REDUCER (The main bus for commands and events)
// ===========================================================================

export function cqrsReducer(state: AppState, action: AppCommand | AppEvent): AppState {

    // Action to handle direct event dispatch (the new Pub/Sub pattern)
    if (action.type === 'DISPATCH_EVENT') {
        return rebuildStateFromEvents([action.event, ...state.eventStream]);
    }
    
    // --- BDD Test Actions ---
    if (action.type === 'REPLAY' || action.type === 'REPLAY_COMPLETE') {
         return rebuildStateFromEvents(state.eventStream);
    }
    
    // --- Command Handling ---
    let stateAfterCommand: AppState;
    switch (action.type) {
        // These are handled by the new Pub/Sub flow, which calls the handler directly.
        // The handler then dispatches a 'DISPATCH_EVENT' action, handled above.
        case 'CREATE_DROITS_MUTATION':
        case 'CREATE_RESSOURCES_MUTATION':
        case 'SUSPEND_PAIEMENTS':
            // These cases are now empty because the UI components call the handlers directly.
            // The handlers then use the `dispatch` function provided by the context,
            // which will trigger the 'DISPATCH_EVENT' action. We keep the cases
            // to avoid a 'default' log, but they do nothing.
            return state; 
        
        // These command handlers return a new state with new events.
        case 'AUTORISER_MODIFICATION_DROITS':
            stateAfterCommand = autoriserModificationDroitsCommandHandler(state, action);
            break;
        case 'AUTORISER_MODIFICATION_RESSOURCES':
            stateAfterCommand = autoriserModificationRessourcesCommandHandler(state, action);
            break;
        case 'ANALYZE_DROITS':
            stateAfterCommand = analyzeDroitsCommandHandler(state, action);
            break;
        case 'VALIDATE_MUTATION':
            stateAfterCommand = validateMutationCommandHandler(state, action);
            break;
        case 'VALIDER_PLAN_CALCUL':
            stateAfterCommand = validerPlanCalculCommandHandler(state, action);
            break;
        case 'AJOUTER_REVENU':
            stateAfterCommand = ajouterRevenuCommandHandler(state, action);
            break;
        case 'AJOUTER_DEPENSE':
            stateAfterCommand = ajouterDepenseCommandHandler(state, action);
            break;
        case 'VALIDER_MODIFICATION_RESSOURCES':
            stateAfterCommand = validerModificationRessourcesCommandHandler(state, action);
            break;
        case 'SUPPRIMER_ECRITURE':
             stateAfterCommand = supprimerEcritureCommandHandler(state, action);
             break;
        case 'METTRE_A_JOUR_ECRITURE':
             stateAfterCommand = mettreAJourEcritureCommandHandler(state, action);
             break;
        default:
             // If the action is not a known command, it might be a raw event from legacy code.
             // We can try to rebuild state just in case.
             return rebuildStateFromEvents(state.eventStream);
    }
    
    // If the command handler added new events, we must rebuild the entire state
    // to ensure all projections are consistent.
    if (stateAfterCommand.eventStream.length > state.eventStream.length) {
        return rebuildStateFromEvents(stateAfterCommand.eventStream);
    }

    // If no new events were generated, return the state as is (e.g., a validation failed).
    return stateAfterCommand;
}


// 4. CONTEXT & PROVIDER
// =======================
const CqrsContext = createContext<{ state: AppState; dispatch: Dispatch<AppCommand | AppEvent>; } | undefined>(undefined);

export function CqrsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cqrsReducer, initialState);

  return (
    <CqrsContext.Provider value={{ state, dispatch }}>
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
  
  // This is the single entry point for all UI interactions.
  const dispatchEvent = (eventOrCommand: AppEvent | AppCommand) => {
    // For commands that generate events via handlers (the new pub/sub pattern)
    if ('handler' in eventOrCommand) {
        eventOrCommand.handler(context.state, (event: AppEvent) => {
            context.dispatch({ type: 'DISPATCH_EVENT', event });
        });
    } else { // For legacy commands or direct event dispatches
        context.dispatch(eventOrCommand);
    }
  };

  return { state: context.state, dispatchEvent };
}
