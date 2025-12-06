
"use client";

import React from 'react';
import { BDDTest1, BDDTest2 } from './creation-de-mutation';
import { BDDTestProjectionPeriodes } from './projection-periodes-validees';
import { BDDTestCreationRessources, BDDTestCreationRessourcesAvecPeriode } from './creation-ressources-mutation';
import { BDDTestsMiseAJourEcritures } from '../mutations/bdd/mise-a-jour-ecritures';

export default function BDDPage() {
    return (
        <div className="p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold">Tests BDD - MutationFlow</h1>
                <p className="text-muted-foreground">Cette page exécute les scénarios de test pour valider les règles métier des Command Handlers et la logique des projections.</p>
            </header>
            <main className="space-y-6">
                <BDDTest1 />
                <BDDTest2 />
                <BDDTestProjectionPeriodes />
                <BDDTestCreationRessources />
                <BDDTestCreationRessourcesAvecPeriode />
                <BDDTestsMiseAJourEcritures />
            </main>
        </div>
    );
}
