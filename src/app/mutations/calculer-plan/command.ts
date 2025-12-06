
"use client";

import type { MonthlyResult } from "../shared/plan-de-calcul.service";

// Command
export interface ValiderPlanCalculCommand {
  type: 'VALIDER_PLAN_CALCUL';
  payload: {
    mutationId: string;
    ressourceVersionId: string; // last one
    calculId: string;
    resultatDuCalcul: MonthlyResult[];
  };
}
