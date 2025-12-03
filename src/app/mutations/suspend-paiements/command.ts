
"use client";

// Command
export interface SuspendPaiementsCommand {
  type: 'SUSPEND_PAIEMENTS';
  payload: {
    mutationId: string;
  };
}
