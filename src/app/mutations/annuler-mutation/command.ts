"use client";

// Command
export interface AnnulerMutationCommand {
  type: 'ANNULER_MUTATION';
  payload: {
    mutationId: string;
  };
}
