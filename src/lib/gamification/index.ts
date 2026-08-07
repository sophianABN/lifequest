import { LEVEL_TITLES } from "@/lib/constants";
import { daysBetween, startOfDay } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════
   XP, NIVEAUX, SÉRIES, BADGES
   Fonctions pures — la persistance est gérée par server/actions/gamification.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * XP cumulée nécessaire pour atteindre un niveau.
 * Courbe en puissance 1.6 : les premiers niveaux tombent vite (récompense
 * immédiate), les suivants demandent un engagement réel sur plusieurs mois.
 */
export function xpForLevel(level: number) {
  if (level <= 1) return 0;
  return Math.floor(120 * Math.pow(level - 1, 1.6));
}

export function levelFromXp(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp && level < 99) level++;
  return level;
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = Math.max(1, next - current);
  return {
    level,
    title: LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 3))],
    xpIntoLevel: xp - current,
    xpForNextLevel: span,
    percent: Math.round(((xp - current) / span) * 100),
    nextLevelAt: next,
  };
}

// ─── Série quotidienne ───────────────────────────────────────────────────────

/**
 * Recalcule la série à partir de la dernière activité.
 * - même jour  → inchangée
 * - lendemain  → +1
 * - au-delà    → la série repart à 1
 */
export function computeStreak(lastActive: Date | null, current: number, today = new Date()) {
  if (!lastActive) return { streak: 1, changed: true };
  const gap = daysBetween(startOfDay(lastActive), startOfDay(today));
  if (gap === 0) return { streak: current, changed: false };
  if (gap === 1) return { streak: current + 1, changed: true };
  return { streak: 1, changed: true };
}

/** La série est-elle encore vivante aujourd'hui ? (sinon on l'affiche grisée) */
export function isStreakAlive(lastActive: Date | null, today = new Date()) {
  if (!lastActive) return false;
  return daysBetween(startOfDay(lastActive), startOfDay(today)) <= 1;
}

// ─── Badges ──────────────────────────────────────────────────────────────────

/** Statistiques agrégées contre lesquelles les règles de badge sont évaluées. */
export interface BadgeStats {
  goalsCompleted: number;
  stepsCompleted: number;
  streakCurrent: number;
  streakLongest: number;
  countriesVisited: number;
  journalEntries: number;
  xp: number;
  moneySaved: number;
  finalGoalCompleted: boolean;
  categoriesCompleted: string[];
  /** Étapes cochées avant 8 h / après 23 h — badges « lève-tôt » et « couche-tard » */
  earlyBirdSteps: number;
  nightOwlSteps: number;
}

export type BadgeRule =
  | { type: "goalsCompleted"; value: number }
  | { type: "stepsCompleted"; value: number }
  | { type: "streak"; value: number }
  | { type: "countries"; value: number }
  | { type: "journalEntries"; value: number }
  | { type: "xp"; value: number }
  | { type: "moneySaved"; value: number }
  | { type: "finalGoal" }
  | { type: "categoryCompleted"; category: string }
  | { type: "earlyBird"; value: number }
  | { type: "nightOwl"; value: number };

export function isBadgeUnlocked(rule: BadgeRule, s: BadgeStats): boolean {
  switch (rule.type) {
    case "goalsCompleted":
      return s.goalsCompleted >= rule.value;
    case "stepsCompleted":
      return s.stepsCompleted >= rule.value;
    case "streak":
      return s.streakLongest >= rule.value;
    case "countries":
      return s.countriesVisited >= rule.value;
    case "journalEntries":
      return s.journalEntries >= rule.value;
    case "xp":
      return s.xp >= rule.value;
    case "moneySaved":
      return s.moneySaved >= rule.value;
    case "finalGoal":
      return s.finalGoalCompleted;
    case "categoryCompleted":
      return s.categoriesCompleted.includes(rule.category);
    case "earlyBird":
      return s.earlyBirdSteps >= rule.value;
    case "nightOwl":
      return s.nightOwlSteps >= rule.value;
    default:
      return false;
  }
}

/** Progression 0-1 vers un badge non débloqué (barre « plus que X »). */
export function badgeProgress(rule: BadgeRule, s: BadgeStats): number {
  const ratio = (current: number, target: number) => Math.min(1, current / Math.max(1, target));
  switch (rule.type) {
    case "goalsCompleted":
      return ratio(s.goalsCompleted, rule.value);
    case "stepsCompleted":
      return ratio(s.stepsCompleted, rule.value);
    case "streak":
      return ratio(s.streakLongest, rule.value);
    case "countries":
      return ratio(s.countriesVisited, rule.value);
    case "journalEntries":
      return ratio(s.journalEntries, rule.value);
    case "xp":
      return ratio(s.xp, rule.value);
    case "moneySaved":
      return ratio(s.moneySaved, rule.value);
    case "earlyBird":
      return ratio(s.earlyBirdSteps, rule.value);
    case "nightOwl":
      return ratio(s.nightOwlSteps, rule.value);
    default:
      return 0;
  }
}

export const TIER_STYLES: Record<string, { ring: string; bg: string; text: string; glow: string }> = {
  bronze: {
    ring: "ring-peach-300",
    bg: "from-peach-300/60 to-gold-200/60",
    text: "text-gold-800 dark:text-peach-300",
    glow: "",
  },
  silver: {
    ring: "ring-ink-300",
    bg: "from-ink-100 to-lilac-200",
    text: "text-ink-700 dark:text-ink-200",
    glow: "",
  },
  gold: {
    ring: "ring-gold-300",
    bg: "from-gold-200 to-gold-400",
    text: "text-gold-900",
    glow: "shadow-glow-gold",
  },
  legendary: {
    ring: "ring-blush-300",
    bg: "from-blush-300 via-lilac-300 to-aqua-300",
    text: "text-ink-900",
    glow: "shadow-glow-blush",
  },
};
