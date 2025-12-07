"use client";

// Command
export interface ExecuterTransactionCommand {
  type: 'EXECUTER_TRANSACTION';
  payload: {
    mutationId: string;
    transactionId: string;
    mois: string; // MM-yyyy
  };
}
