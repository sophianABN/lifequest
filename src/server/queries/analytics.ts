import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { toDateInput } from "@/lib/utils";
import { getSessionUserId } from "./user";

/* ═══════════════════════════════════════════════════════════════════════════
   AGRÉGATS ANALYTICS
   Toutes les séries sont calculées côté serveur : envoyer 3 000 événements XP
   au navigateur pour qu'il les regroupe par mois serait absurde.
   ═══════════════════════════════════════════════════════════════════════════ */

export const getGlobalStats = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const [goals, steps, journalCount, xpAgg, badgeCount] = await Promise.all([
    prisma.goal.findMany({
      where: { userId },
      select: {
        status: true,
        progress: true,
        estimatedCost: true,
        savedAmount: true,
        estimatedHours: true,
        country: true,
        completedAt: true,
      },
    }),
    prisma.step.groupBy({
      by: ["done"],
      where: { goal: { userId } },
      _count: { _all: true },
    }),
    prisma.journalEntry.count({ where: { userId } }),
    prisma.xpEvent.aggregate({ where: { userId }, _sum: { amount: true } }),
    prisma.userBadge.count({ where: { userId } }),
  ]);

  const completed = goals.filter((g) => g.status === "DONE");
  const active = goals.filter((g) => g.status !== "DONE" && g.status !== "ARCHIVED");

  const countries = new Set(
    completed.map((g) => g.country).filter((c): c is string => Boolean(c)),
  );

  return {
    goalsTotal: goals.length,
    goalsCompleted: completed.length,
    goalsActive: active.length,
    completionRate: goals.length ? Math.round((completed.length / goals.length) * 100) : 0,
    /** Moyenne des progressions : reflète l'avancement réel, pas seulement les objectifs finis. */
    overallProgress: goals.length
      ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
      : 0,
    stepsDone: steps.find((s) => s.done)?._count._all ?? 0,
    stepsTotal: steps.reduce((s, row) => s + row._count._all, 0),
    moneySaved: goals.reduce((s, g) => s + g.savedAmount, 0),
    moneySpent: completed.reduce((s, g) => s + (g.estimatedCost ?? 0), 0),
    moneyNeeded: active.reduce((s, g) => s + Math.max(0, (g.estimatedCost ?? 0) - g.savedAmount), 0),
    hoursInvested: completed.reduce((s, g) => s + (g.estimatedHours ?? 0), 0),
    countriesCount: countries.size,
    countries: [...countries],
    journalEntries: journalCount,
    xpTotal: xpAgg._sum.amount ?? 0,
    badgesUnlocked: badgeCount,
  };
});

/** Série mensuelle d'XP sur les 12 derniers mois. */
export const getXpSeries = cache(async (months = 12) => {
  const userId = await getSessionUserId();
  if (!userId) return [];

  const since = new Date();
  since.setMonth(since.getMonth() - months + 1);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const events = await prisma.xpEvent.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Le squelette est généré avant l'agrégation : un mois sans activité doit
  // apparaître à zéro, pas disparaître du graphique.
  const buckets = new Map<string, { month: string; label: string; xp: number; cumulative: number }>();
  for (let i = 0; i < months; i++) {
    const d = new Date(since);
    d.setMonth(since.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      month: key,
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
      xp: 0,
      cumulative: 0,
    });
  }

  for (const e of events) {
    const key = `${e.createdAt.getFullYear()}-${String(e.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.xp += e.amount;
  }

  let running = 0;
  return [...buckets.values()].map((b) => {
    running += b.xp;
    return { ...b, cumulative: running };
  });
});

/** Nombre d'objectifs terminés par année — alimente la courbe « progression annuelle ». */
export const getCompletionsByYear = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return [];

  const goals = await prisma.goal.findMany({
    where: { userId, status: "DONE", completedAt: { not: null } },
    select: { completedAt: true },
  });

  const byYear = new Map<number, number>();
  for (const g of goals) {
    const y = g.completedAt!.getFullYear();
    byYear.set(y, (byYear.get(y) ?? 0) + 1);
  }

  return [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, count]) => ({ year: String(year), count }));
});

/** Répartition des objectifs par catégorie. */
export const getCategoryBreakdown = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return [];

  const categories = await prisma.category.findMany({
    where: { userId },
    select: {
      name: true,
      color: true,
      emoji: true,
      goals: { select: { status: true, progress: true } },
    },
    orderBy: { order: "asc" },
  });

  return categories
    .filter((c) => c.goals.length > 0)
    .map((c) => ({
      name: c.name,
      emoji: c.emoji,
      color: c.color,
      total: c.goals.length,
      done: c.goals.filter((g) => g.status === "DONE").length,
      progress: Math.round(c.goals.reduce((s, g) => s + g.progress, 0) / c.goals.length),
    }));
});

/**
 * Heatmap d'activité sur 52 semaines (style « contributions »).
 * Une journée est active si une étape a été cochée ou une entrée de journal écrite.
 */
export const getActivityHeatmap = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return [];

  const since = new Date();
  since.setDate(since.getDate() - 364);
  since.setHours(0, 0, 0, 0);

  const [steps, journal] = await Promise.all([
    prisma.step.findMany({
      where: { goal: { userId }, completedAt: { gte: since } },
      select: { completedAt: true },
    }),
    prisma.journalEntry.findMany({
      where: { userId, date: { gte: since } },
      select: { date: true },
    }),
  ]);

  const counts = new Map<string, number>();
  const bump = (d: Date) => {
    const key = toDateInput(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  steps.forEach((s) => s.completedAt && bump(s.completedAt));
  journal.forEach((j) => bump(j.date));

  const days: { date: string; count: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toDateInput(d);
    days.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return days;
});

/** Humeur moyenne par semaine, sur les 12 dernières semaines. */
export const getMoodTrend = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return [];

  const since = new Date();
  since.setDate(since.getDate() - 84);

  const entries = await prisma.journalEntry.findMany({
    where: { userId, date: { gte: since } },
    select: { date: true, mood: true },
    orderBy: { date: "asc" },
  });

  const SCORES = { AWFUL: 1, BAD: 2, NEUTRAL: 3, GOOD: 4, GREAT: 5 } as const;
  const weeks = new Map<string, { total: number; count: number }>();

  for (const e of entries) {
    const monday = new Date(e.date);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const key = toDateInput(monday);
    const bucket = weeks.get(key) ?? { total: 0, count: 0 };
    bucket.total += SCORES[e.mood];
    bucket.count += 1;
    weeks.set(key, bucket);
  }

  return [...weeks.entries()].map(([week, { total, count }]) => ({
    week: new Date(week).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    mood: Number((total / count).toFixed(2)),
  }));
});
