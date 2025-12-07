"use client";

// Command
export interface ValiderPlanPaiementCommand {
  type: 'VALIDER_PLAN_PAIEMENT';
  payload: {
    mutationId: string;
  };
}
