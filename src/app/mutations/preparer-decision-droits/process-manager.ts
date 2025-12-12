"use client";

import type { AppEvent, AppState } from '../mutation-lifecycle/domain';
import { queryTodos } from '../projection-todolist/projection';
import { queryMutations } from '../projection-mutations/projection';
import { preparerDecisionDroitsCommandHandler } from './handler';
import type { PlanCalculeEvent } from '../calculer-plan/event';

export function preparerDecisionDroitsProcessManager(state: AppState, event: AppEvent): void {
    // We only care about PLAN_CALCUL_EFFECTUE
    if (event.type !== 'PLAN_CALCUL_EFFECTUE') return;

    const planCalculEvent = event as PlanCalculeEvent;
    const mutationId = planCalculEvent.mutationId;

    // 1. Check Todo: Is "Préparer la décision" marked as "à faire"?
    const todos = queryTodos(state);
    const todo = todos.find(t => t.mutationId === mutationId && t.description === 'Préparer la décision');
    
    if (!todo || todo.status !== 'à faire') {
        return;
    }

    // 2. Check Mutation Type: Is this a DROITS mutation?
    const mutation = queryMutations(state).find(m => m.id === mutationId);
    if (!mutation || mutation.type !== 'DROITS') {
        return;
    }

    // 3. Execute Logic
    console.log(`[ProcessManager] Auto-triggering PREPARER_DECISION_DROITS for mutation ${mutationId}`);
    preparerDecisionDroitsCommandHandler(state, {
        type: 'PREPARER_DECISION_DROITS',
        payload: {
            mutationId: mutationId,
            calculId: planCalculEvent.payload.calculId
        }
    });
}
