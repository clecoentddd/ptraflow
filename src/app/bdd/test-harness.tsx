
"use client";

import React from 'react';
import { BDDTestsMiseAJourEcritures } from '../mutations/bdd/mise-a-jour-ecritures';

// This file is now a wrapper for the test harness located in the mutations directory.
export const BDDTestsMiseAJourEcrituresWrapper: React.FC = () => {
    return <BDDTestsMiseAJourEcritures />; 
};
