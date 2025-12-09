
"use client";

// Command
export interface PreparerDecisionCommand {
  type: 'PREPARER_DECISION';
  payload: {
    mutationId: string;
    calculId: string;
  };
}
