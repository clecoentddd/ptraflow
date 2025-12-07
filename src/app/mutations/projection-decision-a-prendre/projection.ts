
"use client";

import type { AppEvent, AppCommand, AppState, MutationType } from '../mutation-lifecycle/domain';
import type { MonthlyResult } from '../shared/plan-de-calcul.service';
import { queryJournal } from '../projection-journal/projection';
import { queryPlansDeCalcul } from '../projection-plan-calcul/projection';
import { queryValidatedPeriods } from '../projection-periodes-de-droits/projection';
import { queryPlanDePaiement } from '../projection-plan-de-paiement/projection';

// 1. State Slice and Initial State
export interface DecisionData {
    decisionId: string;
    mutationId: string;
    mutationType: MutationType;
    planDeCalcul?: {
        calculId: string;
        detail: MonthlyResult[];
    };
    planDePaiementId: string | null;
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
    const plansDePaiement = queryPlanDePaiement(state);

    const decisions: DecisionData[] = journal.map(entry => {
        const planDeCalcul = plansDeCalcul.find(p => p.mutationId === entry.mutationId);
        
        // Only create a decision if a calculation plan exists for this mutation
        if (!planDeCalcul) {
            return null;
        }
        
        // Find the latest payment plan for this mutation, if any
        const latestPlanDePaiementForThisMutation = plansDePaiement
            .filter(p => p.mutationId === entry.mutationId)
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            [0];

        const decision: DecisionData = {
            decisionId: crypto.randomUUID(),
            mutationId: entry.mutationId,
            mutationType: entry.mutationType,
            planDeCalcul: {
                calculId: planDeCalcul.calculId,
                detail: planDeCalcul.detail,
            },
            planDePaiementId: latestPlanDePaiementForThisMutation ? latestPlanDePaiementForThisMutation.id : null,
        };

        if (entry.mutationType === 'DROITS') {
            const droitsAnalysesEvent = state.eventStream.find(
                e => e.mutationId === entry.mutationId && e.type === 'DROITS_ANALYSES'
            ) as any;
            if (droitsAnalysesEvent) {
                 decision.periodeDroits = {
                    dateDebut: droitsAnalysesEvent.payload.dateDebut,
                    dateFin: droitsAnalysesEvent.payload.dateFin,
                };
            }
        }

        if (entry.ressourcesDateDebut && entry.ressourcesDateFin) {
            decision.periodeModifications = {
                dateDebut: entry.ressourcesDateDebut,
                dateFin: entry.ressourcesDateFin,
            };
        }
        
        return decision;
    }).filter((d): d is DecisionData => d !== null);

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
