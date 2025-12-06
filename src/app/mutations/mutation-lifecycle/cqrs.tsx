

"use client";

import React, { createContext, useContext, useReducer, type Dispatch } from 'react';

// Importation des types de commandes, événements et état depuis le domaine
import type { AppCommand, AppEvent, AppState } from './domain';

// Importation des command handlers
import { createDroitsMutationCommandHandler } from '../create-mutation/handler';
import { createRessourcesMutationCommandHandler } from '../create-ressources-mutation/handler';
import { suspendPaiementsCommandHandler } from '../suspend-paiements/handler';
import { analyzeDroitsCommandHandler } from '../analyze-droits/handler';
import { validerPlanPaiementCommandHandler } from '../valider-plan-paiement/handler';
import { autoriserModificationDroitsCommandHandler } from '../autoriser-modification-des-droits/handler';
import { autoriserModificationRessourcesCommandHandler } from '../autoriser-modification-des-ressources/handler';
import { ajouterRevenuCommandHandler } from '../ecritures/ajouter-revenu/handler';
import { validerModificationRessourcesCommandHandler } from '../valider-modification-ressources/handler';
import { ajouterDepenseCommandHandler } from '../ecritures/ajouter-depense/handler';
import { supprimerEcritureCommandHandler } from '../ecritures/supprimer-ecriture/handler';
import { mettreAJourEcritureCommandHandler } from '../ecritures/mettre-a-jour-ecriture/handler';
import { validerPlanCalculCommandHandler } from '../calculer-plan/handler';
import { validerDecisionCommandHandler } from '../valider-decision/handler';


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
    let stateWithStream: AppState = { ...initialState, eventStream };
    
    // For projections, events must be processed in chronological order (oldest to newest)
    const sortedEventsForProjection = [...eventStream].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Apply each event to all projections that are independent
    for (const event of sortedEventsForProjection) {
        stateWithStream = mutationsProjectionReducer(stateWithStream, event);
        stateWithStream = todolistProjectionReducer(stateWithStream, event);
        stateWithStream = validatedPeriodsProjectionReducer(stateWithStream, event);
        stateWithStream = ecrituresProjectionReducer(stateWithStream, event);
        stateWithStream = planCalculProjectionReducer(stateWithStream, event);
        stateWithStream = planDePaiementProjectionReducer(stateWithStream, event);
    }
    
    // After all individual events are projected, run final projection steps
    // for projections that depend on the final state of other projections (like the journal).
    stateWithStream = journalProjectionReducer(stateWithStream, { type: 'REPLAY_COMPLETE' });
    
    // The decision projection *always* runs after any event has been processed.
    stateWithStream = decisionAPrendreProjectionReducer(stateWithStream, { type: 'REPLAY_COMPLETE' });

    return stateWithStream;
}


// 3. AGGREGATE REDUCER (The main bus for commands and events)
// ===========================================================================
export function cqrsReducer(state: AppState, action: AppCommand): AppState {
    
    let stateAfterEvents: AppState;

    // Action to handle direct event dispatch
    if (action.type === 'DISPATCH_EVENT') {
        const newEventStream = [action.event, ...state.eventStream];
        stateAfterEvents = rebuildStateFromEvents(newEventStream);
    } else if (action.type === 'REPLAY') {
         stateAfterEvents = rebuildStateFromEvents(action.eventStream);
    } else if (action.type === 'REPLAY_COMPLETE') {
        // This action type is only used by projections that need to run at the end.
        // We just return the state as is, because the final step will handle it.
        return state;
    } else {
        // --- Command Handling ---
        let stateAfterCommand: AppState = state;

        switch (action.type) {
            case 'CREATE_DROITS_MUTATION':
                createDroitsMutationCommandHandler(state, (e) => stateAfterCommand = { ...state, eventStream: [e, ...state.eventStream] });
                break;
            case 'CREATE_RESSOURCES_MUTATION':
                createRessourcesMutationCommandHandler(state, (e) => stateAfterCommand = { ...state, eventStream: [e, ...state.eventStream] });
                break;
            case 'SUSPEND_PAIEMENTS':
                 suspendPaiementsCommandHandler(state, action, (e) => stateAfterCommand = { ...state, eventStream: [e, ...state.eventStream] });
                 break;
            case 'AUTORISER_MODIFICATION_DROITS':
                stateAfterCommand = autoriserModificationDroitsCommandHandler(state, action);
                break;
            case 'AUTORISER_MODIFICATION_RESSOURCES':
                stateAfterCommand = autoriserModificationRessourcesCommandHandler(state, action);
                break;
            case 'ANALYZE_DROITS':
                stateAfterCommand = analyzeDroitsCommandHandler(state, action);
                break;
            case 'VALIDER_PLAN_PAIEMENT':
                stateAfterCommand = validerPlanPaiementCommandHandler(state, action);
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
            case 'VALIDER_DECISION':
                stateAfterCommand = validerDecisionCommandHandler(state, action);
                break;
            default:
                 console.warn("Unknown command type in cqrsReducer:", (action as any).type);
                 return state;
        }
        
        if (stateAfterCommand.eventStream.length > state.eventStream.length) {
            stateAfterEvents = rebuildStateFromEvents(stateAfterCommand.eventStream);
        } else {
            return stateAfterCommand;
        }
    }

    return stateAfterEvents;
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
