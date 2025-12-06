
"use client";

import type { AppEvent, AppCommand, AppState, MutationType } from '../mutation-lifecycle/domain';
import type { MonthlyResult } from '../shared/plan-de-calcul.service';
import { queryJournal } from '../projection-journal/projection';
import { queryPlansDeCalcul } from '../projection-plan-calcul/projection';
import { queryValidatedPeriods } from '../projection-periodes-de-droits/projection';
import { queryPlanDePaiement } from '../projection-plan-de-paiement/projection';

// 1. State Slice and Initial State
export interface DecisionData {
    mutationId: string;
    mutationType: MutationType;
    planDeCalcul?: {
        calculId: string;
        detail: MonthlyResult[];
    };
    planDePaiementId?: string;
    periodeDroits?: {
        dateDebut: string;
        dateFin: string;
    };
    periodeModifications?: {
        dateDebut: string;
        dateFin: string;
    };
}

export interface DecisionAPrendreState {
  decisions: DecisionData[];
}

export const initialDecisionAPrendreState: DecisionAPrendreState = {
  decisions: [],
};


// 2. Projection Logic
// This projection rebuilds its state entirely based on the final state of other projections.
function rebuildDecisionState(state: AppState): DecisionAPrendreState {
    const journal = queryJournal(state);
    const plansDeCalcul = queryPlansDeCalcul(state);
    const periodsValides = queryValidatedPeriods(state);
    const plansDePaiement = queryPlanDePaiement(state);

    const decisions: DecisionData[] = journal.map(entry => {
        const decision: DecisionData = {
            mutationId: entry.mutationId,
            mutationType: entry.mutationType,
        };

        const planDeCalcul = plansDeCalcul.find(p => p.mutationId === entry.mutationId);
        if (planDeCalcul) {
            decision.planDeCalcul = {
                calculId: planDeCalcul.calculId,
                detail: planDeCalcul.detail,
            };
        }

        const planDePaiement = plansDePaiement.find(p => p.mutationId === entry.mutationId);
        if (planDePaiement) {
            decision.planDePaiementId = planDePaiement.id;
        }

        if (entry.mutationType === 'DROITS') {
            const period = periodsValides[0]; // The business rule is that there is only ever one.
            if(period) {
                decision.periodeDroits = {
                    dateDebut: period.dateDebut,
                    dateFin: period.dateFin,
                };
            }
        }

        if (entry.mutationType === 'RESSOURCES') {
            if (entry.ressourcesDateDebut && entry.ressourcesDateFin) {
                decision.periodeModifications = {
                    dateDebut: entry.ressourcesDateDebut,
                    dateFin: entry.ressourcesDateFin,
                };
            }
        }
        
        return decision;
    });

    return { decisions };
}

// 3. Slice Reducer
// This reducer only acts at the end of a full replay.
export function decisionAPrendreProjectionReducer(state: AppState, command: AppCommand): AppState {
    if (command.type === 'REPLAY_COMPLETE') {
        const newDecisionState = rebuildDecisionState(state);
        return { ...state, ...newDecisionState };
    }
    return state;
}

// 4. Queries (Selectors)
export function queryDecisionsAPrendre(state: AppState): DecisionData[] {
    return state.decisions;
}
