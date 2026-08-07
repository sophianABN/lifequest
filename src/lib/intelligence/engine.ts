import type { Readiness } from "@prisma/client";

import { PRIORITY_CONFIG } from "@/lib/constants";
import { clamp, daysBetween, getAge } from "@/lib/utils";
import type { Blocker, GoalAnalysis, NextAction, ScorableGoal, UserContext } from "./types";

/* ═══════════════════════════════════════════════════════════════════════════
   MOTEUR D'INTELLIGENCE
   ---------------------------------------------------------------------------
   Fonctions *pures* : mêmes entrées → mêmes sorties. Aucun accès base ni
   réseau, ce qui les rend testables et permet de les rejouer côté client pour
   des simulations (« et si j'épargnais 50 € de plus par mois ? »).
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Saisonnalité ────────────────────────────────────────────────────────────

/**
 * Fenêtres saisonnières conseillées par catégorie / pays.
 * Les mois sont exprimés en base 1 (1 = janvier).
 */
const SEASON_RULES: { match: (g: ScorableGoal) => boolean; months: number[]; label: string }[] = [
  {
    match: (g) => /thail|thaï/i.test(`${g.country} ${g.title}`),
    months: [11, 12, 1, 2, 3],
    label: "Saison sèche en Thaïlande (nov. → mars)",
  },
  {
    match: (g) => /chine|china/i.test(`${g.country} ${g.title}`),
    months: [4, 5, 9, 10],
    label: "Printemps et automne en Chine",
  },
  {
    match: (g) => /safari|kenya|tanzanie|afrique du sud/i.test(`${g.country} ${g.title}`),
    months: [6, 7, 8, 9, 10],
    label: "Saison sèche : meilleure observation animalière",
  },
  {
    match: (g) => /vélo|velo|road ?trip|randonn/i.test(g.title),
    months: [5, 6, 7, 8, 9],
    label: "Belle saison, jours longs",
  },
  {
    match: (g) => /parachute|élastique|elastique|parapente/i.test(g.title),
    months: [4, 5, 6, 7, 8, 9],
    label: "Météo favorable au saut",
  },
  {
    match: (g) => /urbex|photo|shooting/i.test(g.title),
    months: [3, 4, 5, 9, 10],
    label: "Lumière douce du printemps et de l'automne",
  },
  {
    match: (g) => g.categorySlug === "etudes" || /bac|examen/i.test(g.title),
    months: [1, 2, 3, 4, 5, 6],
    label: "Période scolaire : c'est maintenant que ça se joue",
  },
];

export function seasonWindow(goal: ScorableGoal) {
  return SEASON_RULES.find((r) => r.match(goal)) ?? null;
}

/**
 * Vacances scolaires françaises (approximation par plages de dates).
 * Utilisé pour privilégier les objectifs « voyage » aux bonnes périodes.
 */
export function isSchoolHoliday(date: Date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 7 || m === 8) return true; // été
  if (m === 2 && d >= 8) return true; // hiver
  if (m === 4 && d >= 8 && d <= 24) return true; // printemps
  if (m === 10 && d >= 19) return true; // Toussaint
  if (m === 12 && d >= 20) return true; // Noël
  if (m === 1 && d <= 3) return true;
  return false;
}

/** Le mois de juin est réservé aux examens : on déconseille les gros projets. */
export function isExamPeriod(date: Date) {
  const m = date.getMonth() + 1;
  return m === 6;
}

// ─── Composantes du score ────────────────────────────────────────────────────

/** 0-100 : plus la date cible approche, plus l'urgence est forte. */
function urgencyScore(goal: ScorableGoal, ctx: UserContext) {
  const horizon = goal.targetDate ?? ctx.deadlineDate;
  if (!horizon) return 40;
  const days = daysBetween(ctx.now, horizon);
  if (days <= 0) return 100; // en retard
  if (days <= 30) return 95;
  if (days <= 90) return 82;
  if (days <= 180) return 68;
  if (days <= 365) return 52;
  if (days <= 730) return 36;
  return 22;
}

/** 0-100 : capacité à financer l'objectif, en tenant compte de l'épargne. */
function budgetScore(goal: ScorableGoal, ctx: UserContext) {
  const cost = goal.estimatedCost ?? 0;
  if (cost === 0) return 100;
  const available = goal.savedAmount + ctx.availableBudget;
  if (available >= cost) return 100;
  const missing = cost - available;
  if (ctx.monthlySavings <= 0) return 10;
  const months = missing / ctx.monthlySavings;
  if (months <= 1) return 92;
  if (months <= 3) return 78;
  if (months <= 6) return 60;
  if (months <= 12) return 40;
  if (months <= 24) return 22;
  return 8;
}

export function monthsToAfford(goal: ScorableGoal, ctx: UserContext) {
  const cost = goal.estimatedCost ?? 0;
  if (cost === 0) return 0;
  const missing = cost - goal.savedAmount - ctx.availableBudget;
  if (missing <= 0) return 0;
  if (ctx.monthlySavings <= 0) return null;
  return Math.ceil(missing / ctx.monthlySavings);
}

/** 0-100 : le temps libre hebdomadaire permet-il d'absorber l'objectif ? */
function timeScore(goal: ScorableGoal, ctx: UserContext) {
  const hours = goal.estimatedHours ?? 0;
  if (hours === 0) return 85;
  const weekly = Math.max(1, ctx.freeHoursWeekly);
  const weeks = hours / weekly;
  if (weeks <= 2) return 100;
  if (weeks <= 8) return 82;
  if (weeks <= 26) return 62;
  if (weeks <= 52) return 42;
  return 25;
}

/** 0-100 : l'utilisateur est-il déjà lancé ? On récompense l'élan. */
function momentumScore(goal: ScorableGoal, ctx: UserContext) {
  let score = goal.progress * 0.6; // une progression entamée pèse
  if (goal.status === "IN_PROGRESS") score += 25;
  if (goal.stepsTotal > 0) score += 10; // objectif déjà décomposé = actionnable
  if (goal.lastActivityAt) {
    const days = daysBetween(goal.lastActivityAt, ctx.now);
    if (days <= 7) score += 20;
    else if (days <= 30) score += 10;
    else if (days > 120) score -= 10; // objectif qui dort
  }
  return clamp(score, 0, 100);
}

/** 0-100 : la période de l'année est-elle propice ? */
function seasonScore(goal: ScorableGoal, ctx: UserContext) {
  const window = seasonWindow(goal);
  const month = ctx.now.getMonth() + 1;
  let score = 60;
  if (window) score = window.months.includes(month) ? 100 : 35;
  // Un voyage se prépare pendant les vacances scolaires
  if (goal.categorySlug === "voyage" && isSchoolHoliday(ctx.now)) score += 10;
  // En période d'examens on freine tout ce qui n'est pas scolaire
  if (isExamPeriod(ctx.now) && goal.categorySlug !== "etudes") score -= 20;
  return clamp(score, 0, 100);
}

// ─── Blocages ────────────────────────────────────────────────────────────────

function detectBlockers(goal: ScorableGoal, ctx: UserContext): Blocker[] {
  const blockers: Blocker[] = [];
  const age = getAge(ctx.birthDate, ctx.now);

  if (goal.minAge != null && age != null && age < goal.minAge) {
    blockers.push({
      kind: "age",
      label: `Âge minimum requis : ${goal.minAge} ans (tu en as ${age})`,
      hard: true,
    });
  }

  const missing = (goal.estimatedCost ?? 0) - goal.savedAmount - ctx.availableBudget;
  if (missing > 0) {
    const months = ctx.monthlySavings > 0 ? Math.ceil(missing / ctx.monthlySavings) : null;
    blockers.push({
      kind: "budget",
      label:
        months == null
          ? `Il manque ${missing} € et aucune épargne mensuelle n'est renseignée`
          : `Il manque ${missing} € — environ ${months} mois d'épargne`,
      hard: months == null || months > 24,
    });
  }

  const unmet = goal.dependsOn.filter((id) => !ctx.completedGoalIds.includes(id));
  if (unmet.length > 0) {
    blockers.push({
      kind: "dependency",
      label: `${unmet.length} objectif(s) prérequis pas encore terminé(s)`,
      hard: true,
    });
  }

  if (goal.estimatedHours && goal.estimatedHours / Math.max(1, ctx.freeHoursWeekly) > 104) {
    blockers.push({
      kind: "time",
      label: "Demande plus de 2 ans au rythme de temps libre actuel",
      hard: false,
    });
  }

  for (const c of ctx.constraints) {
    if (!c.until || c.until > ctx.now) {
      blockers.push({ kind: "constraint", label: c.label, hard: false });
    }
  }

  const window = seasonWindow(goal);
  if (window && !window.months.includes(ctx.now.getMonth() + 1)) {
    blockers.push({ kind: "season", label: `Meilleure période : ${window.label}`, hard: false });
  }

  return blockers;
}

// ─── Prochaines actions ──────────────────────────────────────────────────────

function suggestNextActions(goal: ScorableGoal, ctx: UserContext, blockers: Blocker[]): NextAction[] {
  const actions: NextAction[] = [];

  if (goal.stepsTotal === 0) {
    actions.push({
      label: "Découper cet objectif en étapes",
      reason: "Sans étapes, un objectif reste un souhait. Commence par 3 actions concrètes.",
    });
  } else if (goal.stepsDone < goal.stepsTotal) {
    actions.push({
      label: "Terminer la prochaine étape en cours",
      reason: `${goal.stepsTotal - goal.stepsDone} étape(s) restante(s).`,
    });
  }

  const budget = blockers.find((b) => b.kind === "budget");
  if (budget) {
    const months = monthsToAfford(goal, ctx);
    actions.push({
      label: "Mettre en place une épargne dédiée",
      reason:
        months == null
          ? "Renseigne une capacité d'épargne mensuelle pour obtenir une date réaliste."
          : `À ${ctx.monthlySavings} €/mois, l'objectif est finançable dans ${months} mois.`,
    });
  }

  if (blockers.some((b) => b.kind === "dependency")) {
    actions.push({
      label: "Avancer d'abord sur les objectifs prérequis",
      reason: "Ils débloqueront celui-ci automatiquement.",
    });
  }

  if (!goal.targetDate) {
    actions.push({
      label: "Fixer une date cible",
      reason: "Un objectif sans date n'a pas d'urgence — et ne se réalise jamais.",
    });
  }

  return actions.slice(0, 3);
}

// ─── Score global ────────────────────────────────────────────────────────────

const WEIGHTS = {
  urgency: 0.24,
  budget: 0.2,
  time: 0.1,
  momentum: 0.19,
  season: 0.09,
  priority: 0.18,
} as const;

export function analyzeGoal(goal: ScorableGoal, ctx: UserContext): GoalAnalysis {
  const blockers = detectBlockers(goal, ctx);

  const components = {
    urgency: urgencyScore(goal, ctx),
    budget: budgetScore(goal, ctx),
    time: timeScore(goal, ctx),
    momentum: momentumScore(goal, ctx),
    season: seasonScore(goal, ctx),
    // La priorité déclarée est convertie sur une échelle 0-100
    priority: clamp(PRIORITY_CONFIG[goal.priority].weight * 55, 0, 100),
  };

  let score = Object.entries(components).reduce(
    (sum, [key, value]) => sum + value * WEIGHTS[key as keyof typeof WEIGHTS],
    0,
  );

  // La difficulté freine légèrement : à intérêt égal, on commence par le plus simple.
  score *= 1 - (goal.difficulty - 3) * 0.04;

  const hasHardBlocker = blockers.some((b) => b.hard);
  if (hasHardBlocker) score *= 0.2;
  if (goal.status === "DONE" || goal.status === "ARCHIVED") score = 0;

  const readiness: Readiness = (() => {
    if (goal.status === "DONE") return "READY";
    if (hasHardBlocker) return "LOCKED";
    const months = monthsToAfford(goal, ctx);
    if (blockers.length === 0) return "READY";
    if (months != null && months <= 6) return "SOON";
    if (months == null || months > 18) return "LATER";
    return "SOON";
  })();

  return {
    goalId: goal.id,
    score: Math.round(clamp(score, 0, 100)),
    readiness,
    blockers,
    nextActions: suggestNextActions(goal, ctx, blockers),
    breakdown: Object.entries(components).map(([label, value]) => ({
      label,
      value: Math.round(value),
      weight: WEIGHTS[label as keyof typeof WEIGHTS],
    })),
    monthsToAfford: monthsToAfford(goal, ctx),
    bestWindow: seasonWindow(goal)?.label ?? null,
  };
}

export function analyzeAll(goals: ScorableGoal[], ctx: UserContext) {
  const analyses = goals.map((g) => analyzeGoal(g, ctx));
  const byId = new Map(analyses.map((a) => [a.goalId, a]));
  return { analyses, byId };
}

/**
 * L'objectif à travailler aujourd'hui.
 *
 * On ne prend pas bêtement le score le plus élevé : on privilégie un objectif
 * réalisable *maintenant* et déjà entamé, pour créer une sensation de
 * progression quotidienne plutôt que d'écraser l'utilisateur avec le plus gros
 * chantier.
 */
export function recommendToday(goals: ScorableGoal[], ctx: UserContext) {
  const active = goals.filter((g) => g.status !== "DONE" && g.status !== "ARCHIVED");
  if (active.length === 0) return null;

  const ranked = active
    .map((goal) => ({ goal, analysis: analyzeGoal(goal, ctx) }))
    .filter(({ analysis }) => analysis.readiness !== "LOCKED")
    .sort((a, b) => {
      // Bonus d'engagement : un objectif déjà en cours passe devant
      const bonus = (x: typeof a) => (x.goal.status === "IN_PROGRESS" ? 8 : 0);
      return b.analysis.score + bonus(b) - (a.analysis.score + bonus(a));
    });

  return ranked[0] ?? null;
}

/** Les objectifs qui basculeront bientôt en « réalisable ». */
export function almostReady(goals: ScorableGoal[], ctx: UserContext, limit = 4) {
  return goals
    .filter((g) => g.status !== "DONE" && g.status !== "ARCHIVED")
    .map((goal) => ({ goal, analysis: analyzeGoal(goal, ctx) }))
    .filter(({ analysis }) => analysis.readiness === "SOON")
    .sort((a, b) => (a.analysis.monthsToAfford ?? 99) - (b.analysis.monthsToAfford ?? 99))
    .slice(0, limit);
}

/** Les objectifs à plus de 80 % — un dernier coup de collier suffit. */
export function nearlyDone(goals: ScorableGoal[], limit = 4) {
  return goals
    .filter((g) => g.status !== "DONE" && g.status !== "ARCHIVED" && g.progress >= 60)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, limit);
}
