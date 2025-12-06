"use client";

// Command
export interface ValiderDecisionCommand {
  type: 'VALIDER_DECISION';
  payload: {
    mutationId: string;
    decisionId: string;
  };
}
