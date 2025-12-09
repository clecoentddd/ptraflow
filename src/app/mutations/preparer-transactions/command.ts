
"use client";

// This command is now internal to the EventBus process manager.
// It is triggered automatically when a PlanDePaiementValideEvent occurs.
// As such, it's no longer part of the public command interface.
// The file is kept for historical context but could be removed.
export interface PreparerTransactionsCommand {
  type: 'PREPARER_TRANSACTIONS';
  payload: {
    planDePaiementId: string;
    mutationId: string;
  };
}
