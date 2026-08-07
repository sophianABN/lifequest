"use client";

import { useTheme } from "next-themes";
import * as React from "react";

import { useMounted } from "@/hooks/use-mounted";

/* ═══════════════════════════════════════════════════════════════════════════
   PALETTE DES GRAPHIQUES
   ---------------------------------------------------------------------------
   Les pastels de la marque sont trop clairs et trop peu saturés pour porter de
   la donnée : ils échouent aux tests de contraste et de séparation daltonienne.
   On dérive donc des variantes plus profondes des mêmes teintes, validées
   séparément pour le thème clair et le thème sombre :
     • bande de luminosité OKLCH respectée
     • chroma minimal (aucune couleur ne « vire au gris »)
     • ΔE ≥ 8 entre paires adjacentes en vision daltonienne
     • contraste ≥ 3:1 avec la surface
   L'ordre est FIXE : la 3ᵉ série garde sa couleur même si la 1ʳᵉ est masquée.
   ═══════════════════════════════════════════════════════════════════════════ */

export const CHART_PALETTE = {
  light: ["#e0669a", "#7a5cc4", "#00a08f", "#b87a2e", "#b8508a", "#4f86e8"],
  dark: ["#df5f93", "#8a63d8", "#14ab99", "#c2872f", "#d05fa0", "#4a8ce8"],
} as const;

/** Rampe séquentielle mono-teinte (magnitude) — heatmap d'activité. */
export const SEQUENTIAL = {
  light: ["#f4f1f5", "#fbd9e6", "#f5aac8", "#e4739c", "#c04a76", "#8d2f52"],
  dark: ["#241f2c", "#4a2740", "#7a3457", "#b04a75", "#dc6f9c", "#f295b6"],
} as const;

export interface ChartTheme {
  palette: readonly string[];
  sequential: readonly string[];
  grid: string;
  axis: string;
  text: string;
  surface: string;
  tooltipBg: string;
  tooltipBorder: string;
  isDark: boolean;
}

/** Thème de graphique dérivé du thème de l'application. */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  // Le thème résolu n'existe pas côté serveur : on part du thème clair pour
  // que le HTML initial corresponde, puis on bascule au montage.
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === "dark";

  return React.useMemo(
    () => ({
      palette: isDark ? CHART_PALETTE.dark : CHART_PALETTE.light,
      sequential: isDark ? SEQUENTIAL.dark : SEQUENTIAL.light,
      grid: isDark ? "#322b3f" : "#ece8ef",
      axis: isDark ? "#4e4457" : "#cfc9d6",
      text: isDark ? "#a79eb3" : "#6b6076",
      surface: isDark ? "#201b29" : "#ffffff",
      tooltipBg: isDark ? "#241e2e" : "#ffffff",
      tooltipBorder: isDark ? "#3a3249" : "#ece8ef",
      isDark,
    }),
    [isDark],
  );
}

/** Options communes aux axes Recharts : grille et axes discrets, texte lisible. */
export function axisProps(theme: ChartTheme) {
  return {
    stroke: theme.axis,
    tick: { fill: theme.text, fontSize: 12 },
    tickLine: false,
    axisLine: false,
  } as const;
}
