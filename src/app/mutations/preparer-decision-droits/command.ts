"use client";

export interface PreparerDecisionDroitsCommand {
  type: 'PREPARER_DECISION_DROITS';
  payload: {
    mutationId: string;
    calculId: string;
  };
}
