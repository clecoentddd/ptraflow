
"use client";

import type { Ecriture } from '../mutation-lifecycle/domain';
import { eachMonthOfInterval, parse, format } from 'date-fns';

export interface MonthlyResult {
    month: string; // MM-yyyy
    revenus: number;
    depenses: number;
    resultat: number;
    calcul: number;
}

// This is a pure service, it has no knowledge of CQRS, mutations, or events.
export function calculatePlan(
    ecritures: Ecriture[],
    moisDebut: string, // MM-yyyy
    moisFin: string // MM-yyyy
): MonthlyResult[] {
    const startDate = parse(moisDebut, 'MM-yyyy', new Date());
    const endDate = parse(moisFin, 'MM-yyyy', new Date());

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
        return [];
    }

    const interval = eachMonthOfInterval({ start: startDate, end: endDate });
    
    const results: MonthlyResult[] = interval.map(monthDate => {
        const monthKey = format(monthDate, 'MM-yyyy');
        let revenus = 0;
        let depenses = 0;

        ecritures.forEach(ecriture => {
            const ecritureStart = parse(ecriture.dateDebut, 'MM-yyyy', new Date());
            const ecritureEnd = parse(ecriture.dateFin, 'MM-yyyy', new Date());
            
            if (monthDate >= ecritureStart && monthDate <= ecritureEnd) {
                if (ecriture.type === 'revenu') {
                    revenus += ecriture.montant;
                } else {
                    depenses += ecriture.montant;
                }
            }
        });

        const resultat = revenus - depenses;
        const calcul = resultat * 0.10; // 10%

        return {
            month: monthKey,
            revenus,
            depenses,
            resultat,
            calcul,
        };
    });

    return results;
}
