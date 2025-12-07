
"use client";

// Command
export interface PreparerTransactionsCommand {
  type: 'PREPARER_TRANSACTIONS';
  payload: {
    planDePaiementId: string;
    mutationId: string;
  };
}
