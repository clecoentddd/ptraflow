
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

// This function applies ONE event to all projections that need to react.
function applyEventToProjections(state: AppState, event: AppEvent): AppState {
    let nextState = state;
    
    // Each projection updates its own slice of the state.
    nextState = mutationsProjectionReducer(nextState, event);
    nextState = todolistProjectionReducer(nextState, event);
    nextState = validatedPeriodsProjectionReducer(nextState, event);
    nextState = ecrituresProjectionReducer(nextState, event);
    nextState = planCalculProjectionReducer(nextState, event);
    // The journal is calculated at the end, as it depends on other projections.
    nextState = journalProjectionReducer(nextState, event);
    
    return nextState;
}

// This function rebuilds the complete state from the event stream.
// It's the core of ensuring consistency.
function rebuildStateFromEvents(events: AppState['eventStream']): AppState {
    let state: AppState = { ...initialState, eventStream: events };
    // Events must be processed in chronological order (oldest to newest)
    const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (const event of sortedEvents) {
        state = applyEventToProjections(state, event);
    }
    // After all individual events are projected, run a final projection step
    // for projections that depend on the final state of other projections (like the journal).
    state = journalProjectionReducer(state, { type: 'REPLAY_COMPLETE' });
    return state;
}

// 3. AGGREGATE REDUCER (The main bus for commands and events)
// ===========================================================================

export function cqrsReducer(state: AppState, action: AppCommand): AppState {

    // New pattern: directly dispatch an event
    if (action.type === 'DISPATCH_EVENT') {
        const newEventStream = [action.event, ...state.eventStream];
        // Rebuild the state from scratch to ensure consistency after the new event.
        return rebuildStateFromEvents(newEventStream);
    }

    // --- Legacy & BDD Command Handling ---
    let stateAfterCommand: AppState;
    switch (action.type) {
        // These are handled by the new Pub/Sub flow and should not be dispatched here.
        case 'CREATE_DROITS_MUTATION':
        case 'CREATE_RESSOURCES_MUTATION':
        case 'SUSPEND_PAIEMENTS':
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
        
        // --- BDD Test Actions ---
        case 'REPLAY': // Applies a single event for projection testing
             return applyEventToProjections({ ...state, eventStream: [action.event, ...state.eventStream] }, action.event);
        case 'REPLAY_COMPLETE': // Rebuilds the full state from the current stream for testing
            return rebuildStateFromEvents(state.eventStream);
        default:
            return state;
    }
    
    // If the command handler added new events, we must rebuild the entire state.
    if (stateAfterCommand.eventStream.length > state.eventStream.length) {
        return rebuildStateFromEvents(stateAfterCommand.eventStream);
    }

    return stateAfterCommand;
}


// 4. CONTEXT & PROVIDER
// =======================
const CqrsContext = createContext<{ state: AppState; dispatchEvent: (event: AppEvent | AppCommand) => void; } | undefined>(undefined);

export function CqrsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cqrsReducer, initialState);

  // This is the single entry point for all UI interactions.
  const dispatchEvent = (eventOrCommand: AppEvent | AppCommand) => {
    if ('type' in eventOrCommand && 'mutationId' in eventOrCommand && 'id' in eventOrCommand) {
        // It's an event, use the pub/sub dispatcher
        dispatch({ type: 'DISPATCH_EVENT', event: eventOrCommand as AppEvent });
    } else {
        // It's a command (for BDD tests or legacy handlers)
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
