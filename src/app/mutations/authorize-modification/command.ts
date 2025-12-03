
"use client";

// Command
export interface AuthorizeModificationCommand {
  type: 'AUTHORIZE_MODIFICATION';
  payload: {
    mutationId: string;
  };
}
