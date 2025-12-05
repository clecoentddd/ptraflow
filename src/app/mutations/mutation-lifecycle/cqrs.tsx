
"use client";

import React, { createContext, useContext, useReducer, type Dispatch } from 'react';

// Importation des types de commandes, événements et état depuis le domaine
import type { AppCommand, AppEvent, AppState } from './domain';

// Importation des command handlers
import { createDroitsMutationCommandHandler } from '../create-mutation/handler';
import { suspendPaiementsCommandHandler } from '../suspend-paiements/handler';
import { analyzeDroitsCommandHandler } from '../analyze-droits/handler';
import { validateMutationCommandHandler } from '../validate-mutation/handler';
import { createRessourcesMutationCommandHandler } from '../create-ressources-mutation/handler';
import { autoriserModificationDroitsCommandHandler } from '../autoriser-modification-des-droits/handler';
import { autoriserModificationRessourcesCommandHandler } from '../autoriser-modification-des-ressources/handler';
import { ajouterRevenuCommandHandler } from '../ecritures/ajouter-revenu/handler';
import { validerModificationRessourcesCommandHandler } from '../valider-modification-ressources/handler';
import { ajouterDepenseCommandHandler } from '../ecritures/ajouter-depense/handler';
import { supprimerEcritureCommandHandler } from '../ecritures/supprimer-ecriture/handler';
import { mettreAJourEcritureCommandHandler } from '../ecritures/mettre-a-jour-ecriture/handler';

// Importation des logiques de projection
import { validatedPeriodsProjectionReducer, initialValidatedPeriodsState } from '../projection-periodes-de-droits/projection';
import { mutationsProjectionReducer, initialMutationsState } from '../projection-mutations/projection';
import { todolistProjectionReducer, initialTodolistState } from '../projection-todolist/projection';
import { ecrituresProjectionReducer, initialEcrituresState } from '../projection-ecritures/projection';
import { journalProjectionReducer, initialJournalState } from '../projection-journal/projection';


// 1. INITIAL STATE
// ==================
export const initialState: AppState = {
  eventStream: [],
  ...initialValidatedPeriodsState,
  ...initialMutationsState,
  ...initialTodolistState,
  ...initialEcrituresState,
  ...initialJournalState,
};

// 2. PROJECTION LOGIC
// ======================

// This function applies a single event to all projection reducers.
function applyEvent(state: AppState, event: AppEvent): AppState {
    let nextState = state;
    
    // Each projection slice reducer is called in order.
    nextState = mutationsProjectionReducer(nextState, event);
    nextState = todolistProjectionReducer(nextState, event);
    nextState = validatedPeriodsProjectionReducer(nextState, event);
    nextState = ecrituresProjectionReducer(nextState, event);
    nextState = journalProjectionReducer(nextState, event);
    
    return nextState;
}

// This function will rebuild the state from the event stream for the main application.
function rebuildStateFromEvents(events: AppState['eventStream']): AppState {
    let state: AppState = { ...initialState, eventStream: events };
    // Events must be processed in chronological order (oldest first)
    const sortedEvents = [...events].reverse();

    for (const event of sortedEvents) {
        state = applyEvent(state, event);
    }
    return state;
}

// 3. AGGREGATE REDUCER (COMMAND DISPATCHER)
// ======================================

export function cqrsReducer(state: AppState, command: AppCommand): AppState {

    // For BDD tests: projection is handled separately.
    if (command.type === 'REPLAY') {
       return applyEvent(state, command.event);
    }
    if (command.type === 'REPLAY_COMPLETE') {
       // We keep all mutations in the state for the todolist to work, but the UI will filter them.
       let finalState = { ...state };
       // Call projection reducers one last time after replay to finalize their state if needed
       finalState = validatedPeriodsProjectionReducer(finalState, command);
       finalState = mutationsProjectionReducer(finalState, command);
       finalState = todolistProjectionReducer(finalState, command);
       finalState = ecrituresProjectionReducer(finalState, command);
       finalState = journalProjectionReducer(finalState, command);
       return finalState;
    }


    let newState = state;

    // The command handlers only produce events and add them to the stream.
    // They don't contain projection logic.
    switch (command.type) {
        case 'CREATE_DROITS_MUTATION':
            newState = createDroitsMutationCommandHandler(state, command);
            break;
        case 'CREATE_RESSOURCES_MUTATION':
            newState = createRessourcesMutationCommandHandler(state, command);
            break;
        case 'SUSPEND_PAIEMENTS':
            newState = suspendPaiementsCommandHandler(state, command);
            break;
        case 'AUTORISER_MODIFICATION_DROITS':
            newState = autoriserModificationDroitsCommandHandler(state, command);
            break;
        case 'AUTORISER_MODIFICATION_RESSOURCES':
            newState = autoriserModificationRessourcesCommandHandler(state, command);
            break;
        case 'ANALYZE_DROITS':
            newState = analyzeDroitsCommandHandler(state, command);
            break;
        case 'VALIDATE_MUTATION':
            newState = validateMutationCommandHandler(state, command);
            break;
        case 'AJOUTER_REVENU':
            newState = ajouterRevenuCommandHandler(state, command);
            break;
        case 'AJOUTER_DEPENSE':
            newState = ajouterDepenseCommandHandler(state, command);
            break;
        case 'VALIDER_MODIFICATION_RESSOURCES':
            newState = validerModificationRessourcesCommandHandler(state, command);
            break;
        case 'SUPPRIMER_ECRITURE':
            newState = supprimerEcritureCommandHandler(state, command);
            break;
        case 'METTRE_A_JOUR_ECRITURE':
            newState = mettreAJourEcritureCommandHandler(state, command);
            break;
        default:
            return state;
    }

    // After a command has potentially added a new event,
    // we rebuild the entire state from the full event stream.
    // This is the "event sourcing" part of the pattern.
    const replayedState = rebuildStateFromEvents(newState.eventStream);
    return { ...replayedState };
}


// 4. CONTEXT & PROVIDER
// =======================
const CqrsContext = createContext<{ state: AppState; dispatch: Dispatch<AppCommand> } | undefined>(undefined);

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
  return context;
}
