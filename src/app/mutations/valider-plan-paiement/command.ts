
"use client";

// This command is now triggered automatically by the event bus process manager
// when a DECISION_VALIDEE event occurs.
export interface ValiderPlanPaiementCommand {
  type: 'VALIDER_PLAN_PAIEMENT';
  payload: {
    mutationId: string;
  };
}
