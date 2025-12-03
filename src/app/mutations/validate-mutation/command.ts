"use client";

// Command
export interface ValidateMutationCommand {
  type: 'VALIDATE_MUTATION';
  payload: {
    mutationId: string;
  };
}
