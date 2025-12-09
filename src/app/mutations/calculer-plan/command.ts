
"use client";

// Command
export interface ValiderPlanCalculCommand {
  type: 'VALIDER_PLAN_CALCUL';
  payload: {
    mutationId: string;
    // All other parameters are now determined by the handler
  };
}
