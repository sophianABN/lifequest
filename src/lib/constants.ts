import type { GoalStatus, Mood, Priority, Readiness } from "@prisma/client";

/**
 * Le nom d'une couleur de marque. Les objectifs et catégories stockent cette
 * clé (et non des classes Tailwind) pour rester indépendants du framework CSS.
 */
export const GOAL_COLORS = [
  "blush",
  "lilac",
  "aqua",
  "gold",
  "mint",
  "peach",
] as const;
export type GoalColor = (typeof GOAL_COLORS)[number];

/**
 * Table de correspondance couleur → classes utilitaires.
 * Tailwind ne peut pas générer de classes construites dynamiquement
 * (`bg-${color}-300`) : elles doivent être écrites en toutes lettres ici.
 */
export const COLOR_CLASSES: Record<
  GoalColor,
  { bg: string; softBg: string; text: string; border: string; ring: string; gradient: string; dot: string }
> = {
  blush: {
    bg: "bg-blush-400",
    softBg: "bg-blush-100 dark:bg-blush-900/30",
    text: "text-blush-700 dark:text-blush-300",
    border: "border-blush-200 dark:border-blush-800",
    ring: "ring-blush-300",
    gradient: "from-blush-300 to-blush-500",
    dot: "bg-blush-400",
  },
  lilac: {
    bg: "bg-lilac-400",
    softBg: "bg-lilac-100 dark:bg-lilac-900/30",
    text: "text-lilac-700 dark:text-lilac-300",
    border: "border-lilac-200 dark:border-lilac-800",
    ring: "ring-lilac-300",
    gradient: "from-lilac-300 to-lilac-500",
    dot: "bg-lilac-400",
  },
  aqua: {
    bg: "bg-aqua-400",
    softBg: "bg-aqua-100 dark:bg-aqua-900/30",
    text: "text-aqua-700 dark:text-aqua-300",
    border: "border-aqua-200 dark:border-aqua-800",
    ring: "ring-aqua-300",
    gradient: "from-aqua-300 to-aqua-500",
    dot: "bg-aqua-400",
  },
  gold: {
    bg: "bg-gold-400",
    softBg: "bg-gold-100 dark:bg-gold-900/30",
    text: "text-gold-700 dark:text-gold-300",
    border: "border-gold-200 dark:border-gold-800",
    ring: "ring-gold-300",
    gradient: "from-gold-300 to-gold-500",
    dot: "bg-gold-400",
  },
  mint: {
    bg: "bg-mint-300",
    softBg: "bg-mint-300/25",
    text: "text-aqua-800 dark:text-mint-300",
    border: "border-mint-300/60",
    ring: "ring-mint-300",
    gradient: "from-mint-300 to-aqua-400",
    dot: "bg-mint-300",
  },
  peach: {
    bg: "bg-peach-300",
    softBg: "bg-peach-300/25",
    text: "text-gold-800 dark:text-peach-300",
    border: "border-peach-300/60",
    ring: "ring-peach-300",
    gradient: "from-peach-300 to-blush-400",
    dot: "bg-peach-300",
  },
};

/** Valeur hexadécimale — nécessaire pour Recharts et le canvas des confettis. */
export const COLOR_HEX: Record<GoalColor, string> = {
  blush: "#f295b6",
  lilac: "#b097da",
  aqua: "#6fd5c9",
  gold: "#e3b778",
  mint: "#b8e6c9",
  peach: "#ffd4b8",
};

export function colorClasses(color: string) {
  return COLOR_CLASSES[(color as GoalColor) in COLOR_CLASSES ? (color as GoalColor) : "blush"];
}

export function colorHex(color: string) {
  return COLOR_HEX[(color as GoalColor) in COLOR_HEX ? (color as GoalColor) : "blush"];
}

// ─── Catégories par défaut ───────────────────────────────────────────────────

export const DEFAULT_CATEGORIES = [
  { name: "Voyage", slug: "voyage", color: "aqua", emoji: "✈️" },
  { name: "Sport", slug: "sport", color: "blush", emoji: "🥊" },
  { name: "Études", slug: "etudes", color: "lilac", emoji: "🎓" },
  { name: "Carrière", slug: "carriere", color: "gold", emoji: "💼" },
  { name: "Aventure", slug: "aventure", color: "mint", emoji: "🪂" },
  { name: "Créativité", slug: "creativite", color: "peach", emoji: "🎬" },
  { name: "Famille & amis", slug: "famille-amis", color: "blush", emoji: "💛" },
  { name: "Style de vie", slug: "style-de-vie", color: "lilac", emoji: "✨" },
] as const;

// ─── Statuts ─────────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
  GoalStatus,
  { label: string; color: GoalColor; icon: string; description: string }
> = {
  TODO: { label: "À faire", color: "lilac", icon: "Circle", description: "Pas encore commencé" },
  IN_PROGRESS: { label: "En cours", color: "blush", icon: "Loader", description: "Tu avances dessus" },
  WAITING: { label: "En attente", color: "gold", icon: "Hourglass", description: "Dépend d'un tiers ou d'une date" },
  BLOCKED: { label: "Bloqué", color: "peach", icon: "Lock", description: "Un prérequis manque" },
  DONE: { label: "Terminé", color: "aqua", icon: "CheckCircle2", description: "Réalisé 🎉" },
  ARCHIVED: { label: "Archivé", color: "mint", icon: "Archive", description: "Mis de côté" },
};

/** Colonnes du Kanban, dans l'ordre d'affichage. `ARCHIVED` en est exclu. */
export const KANBAN_COLUMNS: GoalStatus[] = ["TODO", "IN_PROGRESS", "WAITING", "BLOCKED", "DONE"];

export const PRIORITY_CONFIG: Record<Priority, { label: string; weight: number; color: GoalColor }> = {
  LOW: { label: "Basse", weight: 0.7, color: "mint" },
  MEDIUM: { label: "Moyenne", weight: 1, color: "aqua" },
  HIGH: { label: "Haute", weight: 1.35, color: "gold" },
  CRITICAL: { label: "Critique", weight: 1.7, color: "blush" },
};

export const READINESS_CONFIG: Record<Readiness, { label: string; color: GoalColor; hint: string }> = {
  READY: { label: "Réalisable maintenant", color: "aqua", hint: "Rien ne te bloque, fonce." },
  SOON: { label: "Bientôt réalisable", color: "mint", hint: "Encore un petit effort." },
  LATER: { label: "Plus tard", color: "lilac", hint: "Il faut du temps ou de l'épargne." },
  LOCKED: { label: "Verrouillé", color: "peach", hint: "Un prérequis strict manque." },
};

export const DIFFICULTY_LABELS = ["", "Très facile", "Facile", "Modéré", "Difficile", "Extrême"] as const;

export const MOOD_CONFIG: Record<Mood, { label: string; emoji: string; score: number; color: GoalColor }> = {
  AWFUL: { label: "Horrible", emoji: "😞", score: 1, color: "peach" },
  BAD: { label: "Pas terrible", emoji: "🙁", score: 2, color: "peach" },
  NEUTRAL: { label: "Neutre", emoji: "😌", score: 3, color: "lilac" },
  GOOD: { label: "Bien", emoji: "🙂", score: 4, color: "aqua" },
  GREAT: { label: "Génial", emoji: "🤩", score: 5, color: "blush" },
};

// ─── Gamification ────────────────────────────────────────────────────────────

export const XP = {
  STEP_DONE: 10,
  SUBSTEP_DONE: 5,
  CHECKLIST_DONE: 3,
  GOAL_DONE: 250,
  FINAL_GOAL_DONE: 1000,
  JOURNAL_ENTRY: 15,
  DAILY_STREAK: 5,
  GOAL_CREATED: 5,
  MONEY_SAVED_PER_100: 5,
} as const;

/** Le palier n exige `100 * n^1.5` XP cumulés : progression lente mais régulière. */
export const LEVEL_TITLES = [
  "Rêveuse",
  "Exploratrice",
  "Aventurière",
  "Battante",
  "Stratège",
  "Conquérante",
  "Inarrêtable",
  "Légende",
  "Icône",
  "Mythe vivant",
] as const;

export const APP = {
  name: "LifeQuest",
  tagline: "Transforme tes rêves en itinéraire.",
  defaultQuestTitle: "25 choses à faire avant mes 25 ans",
} as const;
