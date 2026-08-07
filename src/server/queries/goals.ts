import { cache } from "react";

import { prisma } from "@/lib/prisma";
import type { ScorableGoal, UserContext } from "@/lib/intelligence/types";
import { getProfile, getSessionUserId } from "./user";

/** Sélection commune aux listes d'objectifs (cartes, Kanban, timeline). */
const goalListSelect = {
  id: true,
  slug: true,
  title: true,
  emoji: true,
  description: true,
  color: true,
  status: true,
  priority: true,
  difficulty: true,
  progress: true,
  targetDate: true,
  completedAt: true,
  estimatedCost: true,
  savedAmount: true,
  estimatedHours: true,
  country: true,
  city: true,
  minAge: true,
  isFinal: true,
  isFavorit: true,
  order: true,
  coverImage: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true, color: true, emoji: true } },
  _count: { select: { steps: true, comments: true, attachments: true } },
} as const;

export const getGoals = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return [];

  return prisma.goal.findMany({
    where: { userId },
    select: goalListSelect,
    orderBy: [{ isFinal: "asc" }, { order: "asc" }],
  });
});

export type GoalListItem = Awaited<ReturnType<typeof getGoals>>[number];

export const getGoalBySlug = cache(async (slug: string) => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  return prisma.goal.findFirst({
    where: { userId, slug },
    include: {
      category: true,
      steps: { orderBy: { order: "asc" } },
      checklist: { orderBy: { order: "asc" } },
      attachments: { orderBy: { createdAt: "desc" } },
      comments: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, image: true } } } },
      people: { include: { person: true } },
      events: { orderBy: { start: "asc" } },
      journal: { orderBy: { date: "desc" }, take: 10 },
      dependsOn: { include: { prerequisite: { select: { id: true, slug: true, title: true, emoji: true, status: true, progress: true } } } },
      requiredFor: { include: { goal: { select: { id: true, slug: true, title: true, emoji: true, status: true } } } },
    },
  });
});

export type GoalDetail = NonNullable<Awaited<ReturnType<typeof getGoalBySlug>>>;

/**
 * Données brutes du moteur d'intelligence.
 *
 * Une requête agrégée plutôt qu'un `include` complet : le moteur n'a besoin
 * que de compteurs, pas du contenu des étapes.
 */
export const getScorableGoals = cache(async (): Promise<ScorableGoal[]> => {
  const userId = await getSessionUserId();
  if (!userId) return [];

  const goals = await prisma.goal.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      difficulty: true,
      progress: true,
      targetDate: true,
      estimatedCost: true,
      savedAmount: true,
      estimatedHours: true,
      minAge: true,
      country: true,
      category: { select: { slug: true } },
      dependsOn: { select: { prerequisiteId: true } },
      steps: { select: { done: true, completedAt: true } },
    },
  });

  return goals.map((g) => {
    const stepsDone = g.steps.filter((s) => s.done).length;
    const lastActivityAt = g.steps
      .map((s) => s.completedAt)
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return {
      id: g.id,
      title: g.title,
      status: g.status,
      priority: g.priority,
      difficulty: g.difficulty,
      progress: g.progress,
      targetDate: g.targetDate,
      estimatedCost: g.estimatedCost,
      savedAmount: g.savedAmount,
      estimatedHours: g.estimatedHours,
      minAge: g.minAge,
      country: g.country,
      categorySlug: g.category?.slug ?? null,
      dependsOn: g.dependsOn.map((d) => d.prerequisiteId),
      stepsTotal: g.steps.length,
      stepsDone,
      lastActivityAt,
    };
  });
});

export const getUserContext = cache(async (): Promise<UserContext | null> => {
  const profile = await getProfile();
  if (!profile) return null;

  const completed = await prisma.goal.findMany({
    where: { userId: profile.id, status: "DONE" },
    select: { id: true },
  });

  return {
    birthDate: profile.birthDate,
    deadlineDate: profile.deadlineDate,
    freeHoursWeekly: profile.freeHoursWeekly,
    monthlySavings: profile.monthlySavings,
    availableBudget: profile.availableBudget,
    schoolLevel: profile.schoolLevel,
    country: profile.country,
    skills: profile.skills.map((s) => s.name),
    languages: profile.languages.map((l) => ({ name: l.name, level: l.level })),
    completedGoalIds: completed.map((g) => g.id),
    constraints: profile.constraints.map((c) => ({ label: c.label, until: c.until })),
    now: new Date(),
  };
});

export const getCategories = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return [];
  return prisma.category.findMany({ where: { userId }, orderBy: { order: "asc" } });
});

export const getPeople = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return [];
  return prisma.person.findMany({ where: { userId }, orderBy: { name: "asc" } });
});
