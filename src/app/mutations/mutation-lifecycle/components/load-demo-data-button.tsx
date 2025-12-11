"use client";

import { Button } from "@/components/ui/button";
import { loadHistory } from "../event-bus";
import { useState } from "react";
import { toast } from "react-hot-toast";

export function LoadDemoDataButton() {
    const [isLoading, setIsLoading] = useState(false);

    const handleLoadDemo = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/apps/ptraflow/data/mutation-droits-sample.json');
            if (!response.ok) {
                 throw new Error(`Failed to load data: ${response.statusText}`);
            }
            const events = await response.json();
            
            loadHistory(events);
            toast.success("Données de démo ajoutées !");
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors du chargement des données");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button variant="outline" size="sm" onClick={handleLoadDemo} disabled={isLoading}>
            {isLoading ? "Chargement..." : "Charger Démo"}
        </Button>
    );
}
