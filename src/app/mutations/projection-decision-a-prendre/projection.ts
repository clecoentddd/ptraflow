
"use client";

import type { AppEvent, AppCommand, AppState, MutationType } from '../mutation-lifecycle/domain';
import type { MonthlyResult } from '../shared/plan-de-calcul.service';
import { queryJournal } from '../projection-journal/projection';
import { queryPlansDeCalcul } from '../projection-plan-calcul/projection';
import { queryValidatedPeriods } from '../projection-periodes-de-droits/projection';
import { queryPlanDePaiement } from '../../paiements/projection-plan-de-paiement/projection';
import { queryTransactions } from '../../paiements/projection-transactions/projection';
import { parse, format, eachMonthOfInterval, min, max } from 'date-fns';

// 1. State Slice and Initial State
export interface DecisionData {
    decisionId: string;
    mutationId: string;
    mutationType: MutationType;
    planDeCalcul?: {
        calculId: string;
        detail: MonthlyResult & { paiementsEffectues: number; aPayer: number }[];
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
function rebuildDecisionState(state: AppState): DecisionAPrendreState {
    const journal = queryJournal(state);
    const plansDeCalcul = queryPlansDeCalcul(state);
    const allPlansDePaiement = queryPlanDePaiement(state);
    const allTransactions = queryTransactions(state);

    const latestPlanDePaiement = [...allPlansDePaiement].sort(
        (a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
    const latestPlanDePaiementId = latestPlanDePaiement ? latestPlanDePaiement.id : null;

    const decisions: DecisionData[] = journal.map(entry => {
        const planDeCalcul = plansDeCalcul.find(p => p.mutationId === entry.mutationId);
        
        if (!planDeCalcul) {
            return null;
        }

        const transactionsExecutees = allTransactions.filter(t => t.statut === 'Exécuté');
        const paiementsParMois: Record<string, number> = {};

        transactionsExecutees.forEach(tx => {
            paiementsParMois[tx.mois] = (paiementsParMois[tx.mois] || 0) + tx.montant;
        });

        const allMonths = new Set([...Object.keys(paiementsParMois), ...planDeCalcul.detail.map(d => d.month)]);
        const sortedMonths = Array.from(allMonths).sort((a,b) => parse(a, 'MM-yyyy', new Date()).getTime() - parse(b, 'MM-yyyy', new Date()).getTime());

        const detailAvecPaiements = sortedMonths.map(month => {
            const calculDuMois = planDeCalcul.detail.find(d => d.month === month);
            const montantCalcule = calculDuMois ? calculDuMois.calcul : 0;
            const paiementsEffectues = paiementsParMois[month] || 0;
            const aPayer = montantCalcule - paiementsEffectues;

            return {
                ...(calculDuMois || { month, revenus: 0, depenses: 0, resultat: 0, calcul: 0 }),
                paiementsEffectues,
                aPayer
            };
        });

        const decision: DecisionData = {
            decisionId: crypto.randomUUID(),
            mutationId: entry.mutationId,
            mutationType: entry.mutationType,
            planDeCalcul: {
                calculId: planDeCalcul.calculId,
                detail: detailAvecPaiements,
            },
            planDePaiementId: latestPlanDePaiementId,
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
