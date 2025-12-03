
"use client";

// Command
export interface AnalyzeDroitsCommand {
  type: 'ANALYZE_DROITS';
  payload: {
    mutationId: string;
    dateDebut: string;
    dateFin: string;
  };
}
