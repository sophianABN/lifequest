"use client";

import * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ChartTheme } from "@/lib/charts";

/**
 * Cadre commun à tous les graphiques : titre, légende, et *toujours* une vue
 * tableau repliable. Un graphique sans équivalent textuel est inaccessible aux
 * lecteurs d'écran et illisible en impression noir et blanc.
 */
export function ChartShell({
  title,
  description,
  legend,
  children,
  table,
  className,
}: {
  title: string;
  description?: string;
  legend?: { label: string; color: string }[];
  children: React.ReactNode;
  table?: { headers: string[]; rows: (string | number)[][] };
  className?: string;
}) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>

        {legend && legend.length > 1 && (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: item.color }} />
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {children}

      {table && (
        <details className="mt-4 group">
          <summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground hover:text-foreground">
            <span className="group-open:hidden">Afficher les données ▸</span>
            <span className="hidden group-open:inline">Masquer les données ▾</span>
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  {table.headers.map((h) => (
                    <th key={h} className="py-1.5 pr-4 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    {row.map((cell, j) => (
                      <td key={j} className="py-1.5 pr-4 tabular-nums">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </Card>
  );
}

/** Infobulle partagée : même fond, même rayon, même typographie que les popovers. */
export function ChartTooltip({
  theme,
  label,
  rows,
}: {
  theme: ChartTheme;
  label?: React.ReactNode;
  rows: { label: string; value: React.ReactNode; color?: string }[];
}) {
  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs shadow-lifted"
      style={{ backgroundColor: theme.tooltipBg, borderColor: theme.tooltipBorder }}
    >
      {label && <p className="mb-1 font-semibold text-foreground">{label}</p>}
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-1.5 text-muted-foreground">
          {r.color && <span className="size-2 rounded-full" style={{ backgroundColor: r.color }} />}
          {r.label} <span className="font-semibold tabular-nums text-foreground">{r.value}</span>
        </p>
      ))}
    </div>
  );
}
