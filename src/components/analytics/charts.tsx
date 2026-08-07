"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { axisProps, useChartTheme } from "@/lib/charts";
import { ChartShell, ChartTooltip } from "./chart-shell";
import { cn, formatMoney } from "@/lib/utils";

/* Tous les graphiques partagent : marques fines, grille discrète, une seule
   échelle par graphique (jamais deux axes Y), infobulle au survol, et une vue
   tableau repliable pour l'accessibilité. */

// ─── XP cumulée ──────────────────────────────────────────────────────────────

export function XpChart({ data }: { data: { label: string; xp: number; cumulative: number }[] }) {
  const theme = useChartTheme();
  const color = theme.palette[0];

  return (
    <ChartShell
      title="Expérience cumulée"
      description="Somme des XP gagnées, mois après mois"
      table={{
        headers: ["Mois", "XP du mois", "Cumul"],
        rows: data.map((d) => [d.label, d.xp, d.cumulative]),
      }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="xp-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="label" {...axisProps(theme)} />
          <YAxis {...axisProps(theme)} width={52} />
          <Tooltip
            cursor={{ stroke: theme.axis, strokeDasharray: "4 4" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTooltip
                  theme={theme}
                  label={label}
                  rows={[
                    { label: "Cumul", value: `${payload[0].value} XP`, color },
                    { label: "Ce mois", value: `${payload[0].payload.xp} XP` },
                  ]}
                />
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke={color}
            strokeWidth={2}
            fill="url(#xp-fill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

// ─── Objectifs terminés par année ────────────────────────────────────────────

export function CompletionsChart({ data }: { data: { year: string; count: number }[] }) {
  const theme = useChartTheme();
  const color = theme.palette[2];

  if (data.length === 0) {
    return (
      <ChartShell title="Objectifs réalisés par année">
        <p className="py-12 text-center text-sm text-muted-foreground">
          Aucun objectif terminé pour l&apos;instant.
        </p>
      </ChartShell>
    );
  }

  return (
    <ChartShell
      title="Objectifs réalisés par année"
      description="Le rythme réel de ta quête"
      table={{ headers: ["Année", "Objectifs"], rows: data.map((d) => [d.year, d.count]) }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="year" {...axisProps(theme)} />
          <YAxis allowDecimals={false} {...axisProps(theme)} width={52} />
          <Tooltip
            cursor={{ fill: theme.grid, opacity: 0.4 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTooltip
                  theme={theme}
                  label={label}
                  rows={[{ label: "Réalisés", value: payload[0].value as number, color }]}
                />
              ) : null
            }
          />
          {/* Barres fines, extrémités arrondies ancrées à la ligne de base */}
          <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} maxBarSize={38} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

// ─── Équilibre entre catégories ──────────────────────────────────────────────

export function CategoryBalance({
  data,
}: {
  data: { name: string; progress: number; total: number; done: number }[];
}) {
  const theme = useChartTheme();
  const color = theme.palette[1];

  if (data.length === 0) return null;

  return (
    <ChartShell
      title="Équilibre entre catégories"
      description="Progression moyenne par domaine de vie — l'échelle va toujours de 0 à 100 %"
      table={{
        headers: ["Catégorie", "Progression", "Terminés / total"],
        rows: data.map((d) => [d.name, `${d.progress} %`, `${d.done} / ${d.total}`]),
      }}
    >
      {/* Barres horizontales rendues en CSS plutôt qu'avec Recharts : à ces
          niveaux de progression, comparer des longueurs est plus lisible
          qu'un radar, et un simple `width: X%` ne peut pas se désaligner. */}
      <HorizontalBars
        color={color}
        track={theme.grid}
        rows={data.map((d) => ({
          label: d.name,
          value: d.progress,
          max: 100,
          right: `${d.progress} %`,
          hint: `${d.done} terminé(s) sur ${d.total}`,
        }))}
      />
    </ChartShell>
  );
}

/**
 * Barres horizontales en CSS pur.
 * `width` en pourcentage : l'échelle est exacte par construction, et le
 * rendu reste net à toutes les tailles d'écran.
 */
function HorizontalBars({
  rows,
  color,
  track,
  secondaryColor,
}: {
  rows: { label: string; value: number; max: number; right: string; hint?: string; secondary?: number }[];
  color: string;
  track: string;
  secondaryColor?: string;
}) {
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const percent = row.max > 0 ? Math.min(100, (row.value / row.max) * 100) : 0;
        const secondaryPercent =
          row.secondary != null && row.max > 0 ? Math.min(100 - percent, (row.secondary / row.max) * 100) : 0;

        return (
          <li key={row.label} title={row.hint}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate text-foreground">{row.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{row.right}</span>
            </div>
            <div
              className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full"
              style={{ backgroundColor: track }}
              role="img"
              aria-label={`${row.label} : ${row.right}`}
            >
              <span
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${percent}%`, backgroundColor: color }}
              />
              {secondaryPercent > 0 && (
                <span
                  className="h-full rounded-full"
                  style={{ width: `${secondaryPercent}%`, backgroundColor: secondaryColor ?? track }}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Humeur ──────────────────────────────────────────────────────────────────

export function MoodChart({ data }: { data: { week: string; mood: number }[] }) {
  const theme = useChartTheme();
  const color = theme.palette[4];

  if (data.length < 2) return null;

  return (
    <ChartShell
      title="Humeur au fil des semaines"
      description="Moyenne des humeurs notées dans le journal (1 = horrible, 5 = génial)"
      table={{ headers: ["Semaine", "Humeur"], rows: data.map((d) => [d.week, d.mood]) }}
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="week" {...axisProps(theme)} />
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} {...axisProps(theme)} width={52} />
          <Tooltip
            cursor={{ stroke: theme.axis, strokeDasharray: "4 4" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTooltip
                  theme={theme}
                  label={label}
                  rows={[{ label: "Humeur moyenne", value: payload[0].value as number, color }]}
                />
              ) : null
            }
          />
          <Line
            type="monotone"
            dataKey="mood"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 2, stroke: theme.surface }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: theme.surface }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

// ─── Financement des objectifs ───────────────────────────────────────────────

export function FundingChart({
  data,
}: {
  data: { title: string; saved: number; missing: number }[];
}) {
  const theme = useChartTheme();
  const [saved, missing] = [theme.palette[2], theme.grid];

  if (data.length === 0) return null;

  return (
    <ChartShell
      title="Financement des objectifs"
      description="Ce qui est déjà épargné, et ce qu'il reste à trouver"
      legend={[
        { label: "Épargné", color: saved },
        { label: "Restant", color: theme.axis },
      ]}
      table={{
        headers: ["Objectif", "Épargné", "Restant"],
        rows: data.map((d) => [d.title, `${d.saved} €`, `${d.missing} €`]),
      }}
    >
      {/* Chaque barre est à l'échelle de *son* objectif : ce qui se compare
          ici, c'est la part financée, pas les montants absolus. */}
      <HorizontalBars
        color={saved}
        track={missing}
        rows={data.map((d) => {
          const total = d.saved + d.missing;
          return {
            label: d.title,
            value: d.saved,
            max: total || 1,
            right: `${formatMoney(d.saved)} / ${formatMoney(total)}`,
            hint: `${formatMoney(d.missing)} restants à trouver`,
          };
        })}
      />
    </ChartShell>
  );
}

// ─── Heatmap d'activité ──────────────────────────────────────────────────────

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function ActivityHeatmap({ days }: { days: { date: string; count: number }[] }) {
  const theme = useChartTheme();
  const max = Math.max(1, ...days.map((d) => d.count));

  // Découpage en colonnes de 7 jours, la semaine commençant le lundi.
  const weeks: (typeof days)[] = [];
  let current: typeof days = [];
  for (const day of days) {
    const weekday = (new Date(day.date).getDay() + 6) % 7;
    if (weekday === 0 && current.length) {
      weeks.push(current);
      current = [];
    }
    current.push(day);
  }
  if (current.length) weeks.push(current);

  const level = (count: number) => {
    if (count === 0) return 0;
    return Math.min(theme.sequential.length - 1, Math.ceil((count / max) * (theme.sequential.length - 1)));
  };

  const activeDays = days.filter((d) => d.count > 0).length;

  return (
    <ChartShell
      title="Activité sur un an"
      description={`${activeDays} jours actifs sur les 365 derniers`}
      table={{
        headers: ["Mois", "Jours actifs"],
        rows: Object.entries(
          days.reduce<Record<string, number>>((acc, d) => {
            const key = new Date(d.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
            if (d.count > 0) acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          }, {}),
        ),
      }}
    >
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 pr-1 pt-0.5">
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="h-3 text-[0.55rem] leading-3 text-muted-foreground">
                {i % 2 === 1 ? d : ""}
              </span>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => (
                <span
                  key={day.date}
                  title={`${new Date(day.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} — ${day.count} activité(s)`}
                  className={cn("size-3 rounded-[3px] transition-transform hover:scale-125")}
                  style={{ backgroundColor: theme.sequential[level(day.count)] }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
        <span>Moins</span>
        {theme.sequential.map((c) => (
          <span key={c} className="size-3 rounded-[3px]" style={{ backgroundColor: c }} />
        ))}
        <span>Plus</span>
      </div>
    </ChartShell>
  );
}

// ─── Anneau de répartition par statut ────────────────────────────────────────

export function StatusBars({ data }: { data: { label: string; count: number; color: string }[] }) {
  const theme = useChartTheme();
  const total = data.reduce((s, d) => s + d.count, 0) || 1;

  return (
    <ChartShell
      title="Répartition par statut"
      description="Où en sont tes 25 objectifs"
      table={{
        headers: ["Statut", "Objectifs", "Part"],
        rows: data.map((d) => [d.label, d.count, `${Math.round((d.count / total) * 100)} %`]),
      }}
    >
      {/* Barre empilée unique : plus lisible qu'un camembert pour comparer des parts */}
      <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full">
        {data
          .filter((d) => d.count > 0)
          .map((d, i) => (
            <span
              key={d.label}
              className="h-full transition-all first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${(d.count / total) * 100}%`,
                backgroundColor: theme.palette[i % theme.palette.length],
              }}
              title={`${d.label} : ${d.count}`}
            />
          ))}
      </div>

      <ul className="mt-4 space-y-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2.5 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: theme.palette[i % theme.palette.length] }}
            />
            <span className="flex-1 text-muted-foreground">{d.label}</span>
            <span className="font-semibold tabular-nums">{d.count}</span>
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
              {Math.round((d.count / total) * 100)} %
            </span>
          </li>
        ))}
      </ul>
    </ChartShell>
  );
}

/** Petite courbe sans axes — utilisée dans les tuiles de statistique. */
export function Sparkline({ data, colorIndex = 0 }: { data: number[]; colorIndex?: number }) {
  const theme = useChartTheme();
  const color = theme.palette[colorIndex];
  const points = data.map((value, i) => ({ i, value }));

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={points} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Cellules colorées réutilisables pour les graphiques catégoriels. */
export function paletteCells(count: number, palette: readonly string[]) {
  return Array.from({ length: count }, (_, i) => (
    <Cell key={i} fill={palette[i % palette.length]} />
  ));
}
