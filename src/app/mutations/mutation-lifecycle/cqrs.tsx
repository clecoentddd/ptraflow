
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
import { planDePaiementProjectionReducer, initialPlanDePaiementState } from '../projection-plan-de-paiement/projection';
import { decisionAPrendreProjectionReducer, initialDecisionAPrendreState } from '../projection-decision-a-prendre/projection';


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
  ...initialPlanDePaiementState,
  ...initialDecisionAPrendreState,
};

// 2. PROJECTION LOGIC (Le "Subscriber")
// ======================================
// This function rebuilds the complete state from the event stream.
// It's the core of ensuring consistency.
function rebuildStateFromEvents(eventStream: AppState['eventStream']): AppState {
    const stateWithStream: AppState = { ...initialState, eventStream };
    
    // For projections, events must be processed in chronological order (oldest to newest)
    const sortedEventsForProjection = [...eventStream].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Apply each event to all projections that are independent
    let stateAfterIndependentProjections = stateWithStream;
    for (const event of sortedEventsForProjection) {
        stateAfterIndependentProjections = mutationsProjectionReducer(stateAfterIndependentProjections, event);
        stateAfterIndependentProjections = todolistProjectionReducer(stateAfterIndependentProjections, event);
        stateAfterIndependentProjections = validatedPeriodsProjectionReducer(stateAfterIndependentProjections, event);
        stateAfterIndependentProjections = ecrituresProjectionReducer(stateAfterIndependentProjections, event);
        stateAfterIndependentProjections = planCalculProjectionReducer(stateAfterIndependentProjections, event);
        stateAfterIndependentProjections = planDePaiementProjectionReducer(stateAfterIndependentProjections, event);
    }
    
    // After all individual events are projected, run final projection steps
    // for projections that depend on the final state of other projections (like the journal or decision).
    let finalState = stateAfterIndependentProjections;
    finalState = journalProjectionReducer(finalState, { type: 'REPLAY_COMPLETE' });
    finalState = decisionAPrendreProjectionReducer(finalState, { type: 'REPLAY_COMPLETE' });

    return finalState;
}

// 3. AGGREGATE REDUCER (The main bus for commands and events)
// ===========================================================================
export function cqrsReducer(state: AppState, action: AppCommand): AppState {
    
    // Action to handle direct event dispatch
    if (action.type === 'DISPATCH_EVENT') {
        const newEventStream = [action.event, ...state.eventStream];
        return rebuildStateFromEvents(newEventStream);
    }
    
    // --- BDD Test Actions ---
    if (action.type === 'REPLAY') {
         return rebuildStateFromEvents(action.eventStream);
    }
    
    // --- Command Handling ---
    let stateAfterCommand: AppState;
    switch (action.type) {
        case 'CREATE_DROITS_MUTATION':
        case 'CREATE_RESSOURCES_MUTATION':
        case 'SUSPEND_PAIEMENTS':
            // These cases are handled by the UI which calls the handlers directly.
            // The handlers then use the `dispatch` function provided by the context,
            // which will trigger the 'DISPATCH_EVENT' action.
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
             console.warn("Unknown command type in cqrsReducer:", (action as any).type);
             return state;
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
const CqrsContext = createContext<{ state: AppState; dispatch: Dispatch<AppCommand>; } | undefined>(undefined);

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
  const dispatchEvent = (command: AppCommand) => {
    // For commands that generate events via handlers (the new pub/sub pattern)
    // The handler is passed to the command object in the UI.
    if ('handler' in command && typeof command.handler === 'function') {
        command.handler(context.state, (event: AppEvent) => {
            context.dispatch({ type: 'DISPATCH_EVENT', event });
        });
    } else { // For legacy commands or direct event dispatches
        context.dispatch(command);
    }
  };

  return { state: context.state, dispatchEvent };
}
