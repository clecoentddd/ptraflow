"use client";

import { useCqrs } from "@/app/mutations/mutation-lifecycle/cqrs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";

export function AnnulerMutationButton({ mutationId }: { mutationId: string }) {
    const { dispatchEvent } = useCqrs();
    
    const handleAnnuler = () => {
        dispatchEvent({ 
            type: 'ANNULER_MUTATION', 
            payload: { mutationId } 
        });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                    <Ban className="mr-2 h-4 w-4" />
                    Annuler la mutation
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr de vouloir annuler cette mutation ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cette action est irréversible. Toutes les données saisies (écritures, etc.) 
                        pour cette mutation seront supprimées.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Retour</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAnnuler}>
                        Confirmer l'annulation
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
