"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEMO_REFUSAL } from "@/lib/demo";

/**
 * Bandeau de la session de démonstration.
 *
 * Il dit ce qui est possible avant qu'on l'apprenne par un échec. Il assure
 * aussi la traduction des refus : le proxy renvoie un 403 sur toute écriture,
 * ce qui fait échouer la Server Action côté client. Sans le récepteur
 * ci-dessous, le bouton semblerait ne rien faire — exactement le symptôme
 * qu'on cherche à éviter.
 */
export function DemoBanner() {
  React.useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      // Le proxy répond 403 ; Next le remonte sous un message générique
      // (« An unexpected response was received from the server. »), sans rien
      // qui rappelle la démonstration. Inutile d'essayer de le reconnaître :
      // ce composant n'est monté que pour une session de démonstration, où le
      // refus d'écriture est de très loin la cause la plus probable d'une
      // promesse rejetée. Mieux vaut une explication juste dans presque tous
      // les cas qu'un bouton qui ne fait rien.
      event.preventDefault();
      toast.error(DEMO_REFUSAL, {
        id: "demo-lecture-seule", // une seule bulle, même sur plusieurs refus
        description: "Crée ton compte pour enregistrer tes propres objectifs.",
      });
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-lilac-300/50 bg-gradient-to-r from-blush-100 via-lilac-100 to-aqua-100 px-4 py-2.5 text-sm dark:border-lilac-900 dark:from-blush-900/40 dark:via-lilac-900/40 dark:to-aqua-900/30 sm:px-6 lg:px-8"
    >
      <Eye className="size-4 shrink-0 text-lilac-600 dark:text-lilac-300" />
      <p className="min-w-0 flex-1">
        <strong className="font-semibold">Mode démonstration</strong> — tu explores un compte
        d&apos;exemple en lecture seule. Rien n&apos;est modifiable.
      </p>
      <Button asChild size="sm" className="shrink-0">
        <Link href="/inscription">Créer ma quête</Link>
      </Button>
    </div>
  );
}
