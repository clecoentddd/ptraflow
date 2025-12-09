"use client";

import React, { createContext, useContext, useReducer, type Dispatch } from 'react';

// Importation des types de commandes, événements et état depuis le domaine
import type { AppCommand, AppEvent, AppState } from './domain';

// Importation des command handlers
import { createDroitsMutationCommandHandler } from '../create-mutation/handler';
import { createRessourcesMutationCommandHandler } from '../create-ressources-mutation/handler';
import { suspendPaiementsCommandHandler } from '../suspend-paiements/handler';
import { analyzeDroitsCommandHandler } from '../analyze-droits/handler';
import { autoriserModificationDroitsCommandHandler } from '../autoriser-modification-des-droits/handler';
import { autoriserModificationRessourcesCommandHandler } from '../autoriser-modification-des-ressources/handler';
import { ajouterRevenuCommandHandler } from '../ecritures/ajouter-revenu/handler';
import { validerModificationRessourcesCommandHandler } from '../valider-modification-ressources/handler';
import { ajouterDepenseCommandHandler } from '../ecritures/ajouter-depense/handler';
import { supprimerEcritureCommandHandler } from '../ecritures/supprimer-ecriture/handler';
import { mettreAJourEcritureCommandHandler } from '../ecritures/mettre-a-jour-ecriture/handler';
import { validerPlanCalculCommandHandler } from '../calculer-plan/handler';
import { validerDecisionCommandHandler } from '../valider-decision/handler';
import { validerPlanPaiementCommandHandler } from '../valider-plan-paiement/handler';
import { executerTransactionCommandHandler } from '../executer-transaction/handler';
import { preparerTransactionsCommandHandler } from '../preparer-transactions/handler';

// Importation des logiques de projection
import { validatedPeriodsProjectionReducer, initialValidatedPeriodsState } from '../projection-periodes-de-droits/projection';
import { mutationsProjectionReducer, initialMutationsState } from '../projection-mutations/projection';
import { todolistProjectionReducer, initialTodolistState } from '../projection-todolist/projection';
import { ecrituresProjectionReducer, initialEcrituresState } from '../projection-ecritures/projection';
import { journalProjectionReducer, initialJournalState } from '../projection-journal/projection';
import { planCalculProjectionReducer, initialPlanCalculState } from '../projection-plan-calcul/projection';
import { decisionAPrendreProjectionReducer, initialDecisionAPrendreState } from '../projection-decision-a-prendre/projection';
import { planDePaiementProjectionReducer, initialPlanDePaiementState } from '../projection-plan-de-paiement/projection';
import { transactionsProjectionReducer, initialTransactionsState } from '../projection-transactions/projection';


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
  ...initialTransactionsState,
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
        stateWithStream = transactionsProjectionReducer(stateWithStream, event);
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

    // ----- Helper for Process Managers / Sagas -----
    const runProcessManagers = (processedState: AppState, newEvents: AppEvent[]): AppState => {
        let eventsFromProcesses: AppEvent[] = [];
        
        for (const event of newEvents) {
            if (event.type === 'PLAN_DE_PAIEMENT_VALIDE') {
                preparerTransactionsCommandHandler(
                    processedState,
                    {
                        type: 'PREPARER_TRANSACTIONS',
                        payload: {
                            planDePaiementId: (event.payload as any).planDePaiementId,
                            mutationId: event.mutationId
                        }
                    },
                    (generatedEvents) => {
                        eventsFromProcesses = [...eventsFromProcesses, ...generatedEvents];
                    }
                );
            }
        }
        
        if (eventsFromProcesses.length > 0) {
            // If processes generated new events, we recursively rebuild the state
            return rebuildStateFromEvents([...eventsFromProcesses, ...processedState.eventStream]);
        }
        
        return processedState;
    }
    // ---------------------------------------------


    // Action to handle direct event dispatch
    if (action.type === 'DISPATCH_EVENT') {
        const newEventStream = [action.event, ...state.eventStream];
        stateAfterEvents = rebuildStateFromEvents(newEventStream);
        stateAfterEvents = runProcessManagers(stateAfterEvents, [action.event]);
    } else if (action.type === 'DISPATCH_EVENTS') {
        const newEventStream = [...action.events, ...state.eventStream];
        stateAfterEvents = rebuildStateFromEvents(newEventStream);
        stateAfterEvents = runProcessManagers(stateAfterEvents, action.events);
    } else if (action.type === 'REPLAY') {
         // The action for REPLAY must contain the event stream
        if ('eventStream' in action) {
             stateAfterEvents = rebuildStateFromEvents(action.eventStream);
             // Important: When replaying, we also need to simulate process managers
             stateAfterEvents = runProcessManagers(stateAfterEvents, action.eventStream);
        } else {
            return state;
        }
    } else if (action.type === 'REPLAY_COMPLETE') {
        // This action type is only used by projections that need to run at the end.
        // We just return the state as is, because the final step will handle it.
        return state;
    } else {
        // --- Command Handling ---
        let commandGeneratedEvents: AppEvent[] = [];
        
        const dispatch = (events: AppEvent[] | AppEvent) => {
             if (Array.isArray(events)) {
                commandGeneratedEvents = [...commandGeneratedEvents, ...events];
            } else {
                commandGeneratedEvents.push(events);
            }
        };

        switch (action.type) {
            case 'CREATE_DROITS_MUTATION':
                createDroitsMutationCommandHandler(state, dispatch);
                break;
            case 'CREATE_RESSOURCES_MUTATION':
                createRessourcesMutationCommandHandler(state, dispatch);
                break;
            case 'SUSPEND_PAIEMENTS':
                 suspendPaiementsCommandHandler(state, action, dispatch);
                 break;
            case 'AUTORISER_MODIFICATION_DROITS':
                autoriserModificationDroitsCommandHandler(state, action, dispatch);
                break;
            case 'AUTORISER_MODIFICATION_RESSOURCES':
                autoriserModificationRessourcesCommandHandler(state, action, dispatch);
                break;
            case 'ANALYZE_DROITS':
                analyzeDroitsCommandHandler(state, action, dispatch);
                break;
            case 'VALIDER_PLAN_PAIEMENT':
                 validerPlanPaiementCommandHandler(state, action, dispatch);
                break;
            case 'PREPARER_TRANSACTIONS': // This command is now handled by the process manager
                 preparerTransactionsCommandHandler(state, action, dispatch);
                 break;
            case 'VALIDER_PLAN_CALCUL':
                validerPlanCalculCommandHandler(state, action, dispatch);
                break;
            case 'AJOUTER_REVENU':
                ajouterRevenuCommandHandler(state, action, dispatch);
                break;
            case 'AJOUTER_DEPENSE':
                ajouterDepenseCommandHandler(state, action, dispatch);
                break;
            case 'VALIDER_MODIFICATION_RESSOURCES':
                validerModificationRessourcesCommandHandler(state, action, dispatch);
                break;
            case 'SUPPRIMER_ECRITURE':
                 supprimerEcritureCommandHandler(state, action, dispatch);
                 break;
            case 'METTRE_A_JOUR_ECRITURE':
                 mettreAJourEcritureCommandHandler(state, action, dispatch);
                 break;
            case 'VALIDER_DECISION':
                validerDecisionCommandHandler(state, action, dispatch);
                break;
            case 'EXECUTER_TRANSACTION':
                executerTransactionCommandHandler(state, action, dispatch);
                break;
            default:
                 console.warn("Unknown command type in cqrsReducer:", (action as any).type);
                 return state;
        }
        
        if (commandGeneratedEvents.length > 0) {
            stateAfterEvents = rebuildStateFromEvents([...commandGeneratedEvents, ...state.eventStream]);
            stateAfterEvents = runProcessManagers(stateAfterEvents, commandGeneratedEvents);
        } else {
            return state;
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
        const handler = command.handler as any;
        handler(context.state, (eventsOrEvent: AppEvent[] | AppEvent) => {
            if (Array.isArray(eventsOrEvent)) {
                context.dispatch({ type: 'DISPATCH_EVENTS', events: eventsOrEvent });
            } else {
                context.dispatch({ type: 'DISPATCH_EVENT', event: eventsOrEvent });
            }
        });
    } else { // For legacy commands or direct event dispatches
        context.dispatch(command);
    }
  };

  return { state: context.state, dispatchEvent };
}
