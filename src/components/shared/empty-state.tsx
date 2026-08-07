import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { DoodleMountain } from "./decorations";

/**
 * État vide. Toujours accompagné d'une action : un écran vide sans porte de
 * sortie est le meilleur moyen de perdre l'utilisateur.
 */
export function EmptyState({
  title,
  description,
  action,
  illustration,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  illustration?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 text-blush-300 dark:text-blush-500/70">
        {illustration ?? <DoodleMountain className="w-32" />}
      </div>
      <h3 className="font-display text-lg">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
