import type { GoalStatus, Priority, Readiness } from "@prisma/client";

/** Vue minimale d'un objectif dont le moteur a besoin — il ne dépend pas de Prisma. */
export interface ScorableGoal {
  id: string;
  title: string;
  status: GoalStatus;
  priority: Priority;
  difficulty: number;
  progress: number;
  targetDate: Date | null;
  estimatedCost: number | null;
  savedAmount: number;
  estimatedHours: number | null;
  minAge: number | null;
  country: string | null;
  categorySlug: string | null;
  /** Ids d'objectifs prérequis */
  dependsOn: string[];
  /** Nombre d'étapes / d'étapes terminées, pour mesurer l'élan */
  stepsTotal: number;
  stepsDone: number;
  /** Date de la dernière étape cochée — mesure du momentum */
  lastActivityAt: Date | null;
}

/** Profil de vie de l'utilisateur — les « données d'entrée » de l'analyse. */
export interface UserContext {
  birthDate: Date | null;
  deadlineDate: Date | null;
  freeHoursWeekly: number;
  monthlySavings: number;
  availableBudget: number;
  schoolLevel: string | null;
  country: string | null;
  skills: string[];
  languages: { name: string; level: string }[];
  /** Ids des objectifs déjà terminés — libèrent les dépendances */
  completedGoalIds: string[];
  constraints: { label: string; until: Date | null }[];
  now: Date;
}

export interface Blocker {
  kind: "age" | "budget" | "time" | "dependency" | "constraint" | "season";
  label: string;
  /** true = verrou dur : impossible d'avancer tant qu'il n'est pas levé */
  hard: boolean;
}

export interface NextAction {
  label: string;
  reason: string;
}

export interface GoalAnalysis {
  goalId: string;
  /** 0-100. Plus c'est haut, plus c'est le bon moment de s'y mettre. */
  score: number;
  readiness: Readiness;
  blockers: Blocker[];
  nextActions: NextAction[];
  /** Détail des composantes du score, affiché dans le panneau « pourquoi ». */
  breakdown: { label: string; value: number; weight: number }[];
  /** Mois estimé avant d'avoir épargné le budget nécessaire */
  monthsToAfford: number | null;
  /** Fenêtre saisonnière conseillée */
  bestWindow: string | null;
}
