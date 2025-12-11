

"use client";

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
import { preparerDecisionCommandHandler } from '../preparer-decision/handler';
import { validerDecisionCommandHandler } from '../valider-decision/handler';
import { validerPlanPaiementCommandHandler } from '../valider-plan-paiement/handler';
import { executerTransactionCommandHandler } from '../executer-transaction/handler';
import { preparerTransactionsCommandHandler } from '../preparer-transactions/handler';
import { annulerMutationCommandHandler } from '../annuler-mutation/handler';

// Importation des logiques de projection
import { validatedPeriodsProjectionReducer, initialValidatedPeriodsState } from '../projection-periodes-de-droits/projection';
import { mutationsProjectionReducer, initialMutationsState } from '../projection-mutations/projection';
import { todolistProjectionReducer, initialTodolistState } from '../projection-todolist/projection';
import { ecrituresProjectionReducer, initialEcrituresState } from '../projection-ecritures/projection';
import { planCalculProjectionReducer, initialPlanCalculState } from '../projection-plan-calcul/projection';
import { decisionAPrendreProjectionReducer, initialDecisionAPrendreState } from '../projection-decision-a-prendre/projection';
import { planDePaiementProjectionReducer, initialPlanDePaiementState } from '../projection-plan-de-paiement/projection';
import { transactionsProjectionReducer, initialTransactionsState } from '../projection-transactions/projection';
import { decisionHistoryProjectionReducer, initialDecisionHistoryState } from '../projection-decision-history/projection';


type Subscriber = (state: AppState) => void;

// Le Bus d'Événements centralise l'état et la logique de publication.
class EventBusManager {
    private state: AppState = this.getInitialState();
    private subscribers: Subscriber[] = [];
    
    private getInitialState(): AppState {
        return {
          eventStream: [],
          ...initialValidatedPeriodsState,
          ...initialMutationsState,
          ...initialTodolistState,
          ...initialEcrituresState,
          ...initialPlanCalculState,
          ...initialPlanDePaiementState,
          ...initialDecisionAPrendreState,
          ...initialTransactionsState,
          ...initialDecisionHistoryState,
        };
    }

    private applyProjections(state: AppState, events: AppEvent[]): AppState {
        let newState = state;
        for (const event of events) {
            newState = mutationsProjectionReducer(newState, event);
            newState = todolistProjectionReducer(newState, event);
            newState = validatedPeriodsProjectionReducer(newState, event);
            newState = ecrituresProjectionReducer(newState, event);
            newState = planCalculProjectionReducer(newState, event);
            newState = planDePaiementProjectionReducer(newState, event);
            newState = transactionsProjectionReducer(newState, event);
            newState = decisionAPrendreProjectionReducer(newState, event);
            newState = decisionHistoryProjectionReducer(newState, event);
        }
        return newState;
    }


    // Exécute les logiques qui doivent réagir à de nouveaux événements (Sagas / Process Managers).
    private runProcessManagers(newEvents: AppEvent[]) {
        const sortedNewEvents = [...newEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        for (const event of sortedNewEvents) {
            // A validated plan triggers transaction preparation
            if (event.type === 'PLAN_DE_PAIEMENT_VALIDE') {
                preparerTransactionsCommandHandler(this.state, event);
            }
             // A calculation triggers decision preparation
             if (event.type === 'PLAN_CALCUL_EFFECTUE') {
                preparerDecisionCommandHandler(this.state, {
                    type: 'PREPARER_DECISION',
                    payload: {
                        mutationId: event.mutationId,
                        calculId: event.payload.calculId
                    }
                });
            }
             // A validated decision triggers payment plan validation
            if (event.type === 'DECISION_VALIDEE') {
                validerPlanPaiementCommandHandler(this.state, {
                    type: 'VALIDER_PLAN_PAIEMENT',
                    payload: {
                        mutationId: event.mutationId,
                    }
                });
            }
        }
    }
    
    // Ajoute un ou plusieurs événements au flux.
    public appendEvents(events: AppEvent[]) {
        if (events.length === 0) return;
        const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        // 1. Add new events to the stream
        this.state = {
            ...this.state,
            eventStream: [...this.state.eventStream, ...sortedEvents],
        }

        // 2. Apply projections for new events
        this.state = this.applyProjections(this.state, sortedEvents);
        
        // 3. Run any process managers that react to these new events
        this.runProcessManagers(sortedEvents);
    }
    
    // Notifie tous les abonnés du nouvel état.
    public publish() {
        this.subscribers.forEach(callback => callback(this.state));
    }
    
    // Permet à un composant de s'abonner aux changements.
    public subscribe(callback: Subscriber): () => void {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }
    
    // Récupère l'état actuel.
    public getState(): AppState {
        return this.state;
    }

    // Réinitialise et réhydrate l'état pour les tests.
    public rehydrateForTesting(events: AppEvent[]) {
        let state = this.getInitialState();
        const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        state = {
            ...state,
            eventStream: sortedEvents,
        }
        
        state = this.applyProjections(state, sortedEvents);
        this.state = state;

        // this.runProcessManagers(sortedEvents); // DO NOT RUN PROCESS MANAGERS ON REHYDRATION
        this.publish(); // Notify test components
    }

    // Charge un historique d'événements sans déclencher les effets de bord (Process Managers)
    public loadHistory(events: AppEvent[]) {
        const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        // 1. Add new events to the stream
        this.state = {
            ...this.state,
            eventStream: [...this.state.eventStream, ...sortedEvents],
        }

        // 2. Apply projections for new events
        this.state = this.applyProjections(this.state, sortedEvents);
        
        // 3. DO NOT Run process managers
        this.publish();
    }
}

// Instance unique du Bus
export const EventBus = new EventBusManager();


// --- Fonctions d'interface pour le reste de l'application ---

export function publishEvent(event: AppEvent) {
    EventBus.appendEvents([event]);
    EventBus.publish();
}

export function publishEvents(events: AppEvent[]) {
    EventBus.appendEvents(events);
    EventBus.publish();
}

export function loadHistory(events: AppEvent[]) {
    EventBus.loadHistory(events);
}

export function subscribeToEventBus(callback: Subscriber) {
    return EventBus.subscribe(callback);
}

// Pour les tests BDD uniquement
export function rehydrateStateForTesting(events: AppEvent[]) {
    EventBus.rehydrateForTesting(events);
}


// Le routeur de commandes, qui appelle le bon handler.
export function dispatchCommand(command: AppCommand) {
    const currentState = EventBus.getState();
    switch (command.type) {
        case 'CREATE_DROITS_MUTATION':
            createDroitsMutationCommandHandler(currentState);
            break;
        case 'CREATE_RESSOURCES_MUTATION':
            createRessourcesMutationCommandHandler(currentState);
            break;
        case 'SUSPEND_PAIEMENTS':
             suspendPaiementsCommandHandler(currentState, command);
             break;
        case 'AUTORISER_MODIFICATION_DROITS':
            autoriserModificationDroitsCommandHandler(currentState, command);
            break;
        case 'AUTORISER_MODIFICATION_RESSOURCES':
            autoriserModificationRessourcesCommandHandler(currentState, command);
            break;
        case 'ANALYZE_DROITS':
            analyzeDroitsCommandHandler(currentState, command);
            break;
        case 'VALIDER_PLAN_PAIEMENT':
             validerPlanPaiementCommandHandler(currentState, command);
             break;
        case 'VALIDER_PLAN_CALCUL':
            validerPlanCalculCommandHandler(currentState, command);
            break;
        case 'PREPARER_DECISION':
            preparerDecisionCommandHandler(currentState, command);
            break;
        case 'AJOUTER_REVENU':
            ajouterRevenuCommandHandler(currentState, command);
            break;
        case 'AJOUTER_DEPENSE':
            ajouterDepenseCommandHandler(currentState, command);
            break;
        case 'VALIDER_MODIFICATION_RESSOURCES':
            validerModificationRessourcesCommandHandler(currentState, command);
            break;
        case 'SUPPRIMER_ECRITURE':
             supprimerEcritureCommandHandler(currentState, command);
             break;
        case 'METTRE_A_JOUR_ECRITURE':
             mettreAJourEcritureCommandHandler(currentState, command);
             break;
        case 'VALIDER_DECISION':
            validerDecisionCommandHandler(currentState, command);
            break;
        case 'EXECUTER_TRANSACTION':
            executerTransactionCommandHandler(currentState, command);
            break;
        case 'PREPARER_TRANSACTIONS':
            const planEvent = currentState.eventStream.find(e => e.id === command.payload.planDePaiementId && e.type === 'PLAN_DE_PAIEMENT_VALIDE');
            if (planEvent) {
                 // We cast here because we verified the type in the find predicate
                 preparerTransactionsCommandHandler(currentState, planEvent as any);
            } else {
                console.error(`[EventBus] Could not find PlanDePaiementValideEvent with id ${command.payload.planDePaiementId}`);
            }
            break;
        case 'ANNULER_MUTATION':
            annulerMutationCommandHandler(currentState, command);
            break;
        default:
             console.warn("Unknown command type in dispatchCommand:", (command as any).type);
    }
}
