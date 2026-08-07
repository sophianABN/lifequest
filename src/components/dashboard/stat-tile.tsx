import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { AnimatedNumber, type NumberFormat } from "@/components/shared/animated-number";
import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/constants";

/** Tuile de statistique — même gabarit partout pour que les chiffres se comparent. */
export function StatTile({
  icon,
  label,
  value,
  suffix,
  hint,
  color = "blush",
  format = "number",
}: {
  icon: ReactNode;
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  color?: string;
  format?: NumberFormat;
}) {
  const colors = colorClasses(color);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2.5">
        <span className={cn("grid size-9 place-items-center rounded-xl", colors.softBg, colors.text)}>
          {icon}
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 font-display text-2xl tabular-nums">
        <AnimatedNumber value={value} format={format} />
        {suffix && <span className="ml-1 text-base font-normal text-muted-foreground">{suffix}</span>}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
