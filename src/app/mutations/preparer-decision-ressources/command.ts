"use client";

export interface PreparerDecisionRessourcesCommand {
  type: 'PREPARER_DECISION_RESSOURCES';
  payload: {
    mutationId: string;
    calculId: string;
  };
}
