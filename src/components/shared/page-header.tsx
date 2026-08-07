import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { DoodleUnderline } from "./decorations";

/** En-tête de page : titre souligné à la main, sous-titre, actions à droite. */
export function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-7 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <div className="relative inline-block">
          <h1 className="flex items-center gap-2.5 text-3xl sm:text-4xl">
            {icon}
            <span>{title}</span>
          </h1>
          <DoodleUnderline className="absolute -bottom-1.5 left-0 h-2.5 text-blush-300/70 dark:text-blush-500/50" />
        </div>
        {description && (
          <p className="mt-3.5 max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
