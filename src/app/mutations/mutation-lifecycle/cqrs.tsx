"use client";

import React, { createContext, useContext, useState, useEffect, type Dispatch } from 'react';
import type { AppCommand, AppEvent, AppState } from './domain';
import { EventBus, subscribeToEventBus, dispatchCommand } from './event-bus';

// 1. CONTEXT
// =======================
const CqrsContext = createContext<{ state: AppState; dispatch: (command: AppCommand) => void; } | undefined>(undefined);

// 2. PROVIDER
// =======================
export function CqrsProvider({ children }: { children: React.ReactNode }) {
  // Le state de l'UI est maintenant un simple useState, mis à jour par un abonnement.
  const [state, setState] = useState<AppState>(EventBus.getState());

  useEffect(() => {
    // On s'abonne aux changements publiés par l'EventBus.
    const unsubscribe = subscribeToEventBus((newState) => {
      setState(newState);
    });
    // On se désabonne au cleanup pour éviter les fuites mémoire.
    return () => unsubscribe();
  }, []);

  // La fonction dispatch du provider ne fait plus que transmettre la commande.
  const handleDispatch = (command: AppCommand) => {
    dispatchCommand(command);
  };
  
  return (
    <CqrsContext.Provider value={{ state, dispatch: handleDispatch }}>
      {children}
    </CqrsContext.Provider>
  );
}

// 3. HOOK
// =========
export function useCqrs() {
  const context = useContext(CqrsContext);
  if (context === undefined) {
    throw new Error('useCqrs must be used within a CqrsProvider');
  }
  
  // La logique a été déplacée dans l'EventBus. Le hook devient un simple passe-plat.
  return { state: context.state, dispatchEvent: context.dispatch };
}
