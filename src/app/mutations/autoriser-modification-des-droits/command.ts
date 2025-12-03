"use client";

// Command
export interface AutoriserModificationDroitsCommand {
  type: 'AUTORISER_MODIFICATION_DROITS';
  payload: {
    mutationId: string;
  };
}

    