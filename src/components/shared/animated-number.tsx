"use client";

import * as React from "react";
import { animate, useMotionValue, useReducedMotion } from "motion/react";

import { formatCompact, formatMoney } from "@/lib/utils";

/**
 * Le format est désigné par une *clé* et non par une fonction : ce composant
 * est appelé depuis des Server Components, qui ne peuvent pas passer de
 * fonction à travers la frontière serveur/client.
 */
export type NumberFormat = "number" | "money" | "compact" | "percent";

const FORMATTERS: Record<NumberFormat, (n: number) => string> = {
  number: (n) => Math.round(n).toLocaleString("fr-FR"),
  money: (n) => formatMoney(Math.round(n)),
  compact: (n) => formatCompact(Math.round(n)),
  percent: (n) => `${Math.round(n)} %`,
};

/**
 * Compteur qui s'anime jusqu'à sa valeur. Utilisé partout où un chiffre
 * représente un accomplissement : la montée visuelle fait exister le progrès.
 */
export function AnimatedNumber({
  value,
  duration = 1.1,
  format = "number",
  className,
}: {
  value: number;
  duration?: number;
  format?: NumberFormat;
  className?: string;
}) {
  const formatter = FORMATTERS[format];
  const motionValue = useMotionValue(0);
  const reduced = useReducedMotion();
  const [animated, setAnimated] = React.useState(() => formatter(0));

  React.useEffect(() => {
    // Animation désactivée : la valeur finale est calculée au rendu, il n'y a
    // rien à piloter ici.
    if (reduced) return;

    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setAnimated(formatter(latest)),
    });
    return () => controls.stop();
  }, [value, duration, reduced, formatter, motionValue]);

  const display = reduced ? formatter(value) : animated;

  return (
    <span className={className} suppressHydrationWarning>
      {display}
    </span>
  );
}
