import { prisma } from "@/lib/prisma";
import { XP } from "@/lib/constants";
import {
  computeStreak,
  isBadgeUnlocked,
  levelFromXp,
  type BadgeRule,
  type BadgeStats,
} from "@/lib/gamification";

/* ═══════════════════════════════════════════════════════════════════════════
   EFFETS DE GAMIFICATION
   Appelés depuis les Server Actions après chaque action « méritante ».
   ═══════════════════════════════════════════════════════════════════════════ */

/** Ajoute de l'XP, journalise l'événement et met le niveau à jour. */
export async function awardXp(userId: string, amount: number, reason: string, goalId?: string) {
  if (amount === 0) return null;

  const [, user] = await prisma.$transaction([
    prisma.xpEvent.create({ data: { userId, amount, reason, goalId } }),
    prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: amount } },
      select: { xp: true, level: true },
    }),
  ]);

  const newLevel = levelFromXp(user.xp);
  if (newLevel !== user.level) {
    await prisma.user.update({ where: { id: userId }, data: { level: newLevel } });
    await prisma.notification.create({
      data: {
        userId,
        type: "MOTIVATION",
        title: `Niveau ${newLevel} atteint 🎉`,
        body: "Ta constance paie. Continue comme ça.",
        href: "/badges",
      },
    });
    return { leveledUp: true, level: newLevel, xp: user.xp };
  }

  return { leveledUp: false, level: newLevel, xp: user.xp };
}

/**
 * Met à jour la série quotidienne. Appelée à chaque action significative :
 * c'est l'activité réelle qui fait vivre la série, pas la simple connexion.
 */
export async function touchStreak(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastActiveDate: true, streakCurrent: true, streakLongest: true },
  });
  if (!user) return null;

  const { streak, changed } = computeStreak(user.lastActiveDate, user.streakCurrent);
  if (!changed) return { streak, changed: false };

  await prisma.user.update({
    where: { id: userId },
    data: {
      streakCurrent: streak,
      streakLongest: Math.max(streak, user.streakLongest),
      lastActiveDate: new Date(),
    },
  });
  await awardXp(userId, XP.DAILY_STREAK, `Série de ${streak} jours`);

  return { streak, changed: true };
}

/**
 * Agrège les statistiques nécessaires à l'évaluation des badges.
 *
 * Exportée pour que l'écran Badges affiche exactement les mêmes chiffres que
 * ceux qui débloquent : les barres « plus que X » sont donc exactes, pas une
 * approximation.
 */
export async function collectBadgeStats(userId: string): Promise<BadgeStats> {
  const [user, goals, steps, journalEntries, categories] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { xp: true, streakCurrent: true, streakLongest: true },
    }),
    prisma.goal.findMany({
      where: { userId },
      select: { status: true, country: true, savedAmount: true, isFinal: true, categoryId: true },
    }),
    prisma.step.findMany({
      where: { goal: { userId }, done: true },
      select: { completedAt: true },
    }),
    prisma.journalEntry.count({ where: { userId } }),
    prisma.category.findMany({ where: { userId }, select: { id: true, slug: true, goals: { select: { status: true } } } }),
  ]);

  const completed = goals.filter((g) => g.status === "DONE");

  return {
    goalsCompleted: completed.length,
    stepsCompleted: steps.length,
    streakCurrent: user.streakCurrent,
    streakLongest: user.streakLongest,
    countriesVisited: new Set(completed.map((g) => g.country).filter(Boolean)).size,
    journalEntries,
    xp: user.xp,
    moneySaved: goals.reduce((s, g) => s + g.savedAmount, 0),
    finalGoalCompleted: completed.some((g) => g.isFinal),
    categoriesCompleted: categories
      .filter((c) => c.goals.length > 0 && c.goals.every((g) => g.status === "DONE"))
      .map((c) => c.slug),
    earlyBirdSteps: steps.filter((s) => s.completedAt && s.completedAt.getHours() < 8).length,
    nightOwlSteps: steps.filter((s) => s.completedAt && s.completedAt.getHours() >= 23).length,
  };
}

/**
 * Évalue tous les badges et débloque ceux qui viennent d'être atteints.
 * Retourne uniquement les *nouveaux* badges, pour que l'interface puisse
 * lancer l'animation de célébration.
 */
export async function evaluateBadges(userId: string) {
  const [badges, owned, stats] = await Promise.all([
    prisma.badge.findMany(),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
    collectBadgeStats(userId),
  ]);

  const ownedIds = new Set(owned.map((b) => b.badgeId));
  const newlyUnlocked = badges.filter(
    (b) => !ownedIds.has(b.id) && isBadgeUnlocked(b.rule as unknown as BadgeRule, stats),
  );

  if (newlyUnlocked.length === 0) return [];

  await prisma.$transaction([
    prisma.userBadge.createMany({
      data: newlyUnlocked.map((b) => ({ userId, badgeId: b.id })),
      skipDuplicates: true,
    }),
    prisma.notification.createMany({
      data: newlyUnlocked.map((b) => ({
        userId,
        type: "BADGE_UNLOCKED" as const,
        title: `Badge débloqué : ${b.name}`,
        body: b.description,
        href: "/badges",
      })),
    }),
  ]);

  // La récompense en XP est versée après coup pour ne pas fausser la règle
  // « atteindre X XP » du badge lui-même.
  for (const badge of newlyUnlocked) {
    if (badge.xpReward > 0) await awardXp(userId, badge.xpReward, `Badge : ${badge.name}`);
  }

  return newlyUnlocked.map((b) => ({
    code: b.code,
    name: b.name,
    description: b.description,
    icon: b.icon,
    tier: b.tier,
  }));
}

/** Enchaînement standard après une action méritante. */
export async function rewardActivity(
  userId: string,
  xpAmount: number,
  reason: string,
  goalId?: string,
) {
  const [xpResult] = await Promise.all([
    awardXp(userId, xpAmount, reason, goalId),
    touchStreak(userId),
  ]);
  const badges = await evaluateBadges(userId);
  return { ...xpResult, badges };
}
