import type { BadgeRule } from "@/lib/gamification";

/**
 * Catalogue de badges. La règle est stockée en JSON dans la base pour pouvoir
 * ajouter des badges sans migration ; elle est évaluée par
 * `lib/gamification/isBadgeUnlocked`.
 */
export const SEED_BADGES: {
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "legendary";
  xpReward: number;
  rule: BadgeRule;
}[] = [
  // ── Progression sur les objectifs ──────────────────────────────────────────
  { code: "first-goal", name: "Le premier pas", description: "Terminer ton tout premier objectif.", icon: "Sparkles", tier: "bronze", xpReward: 50, rule: { type: "goalsCompleted", value: 1 } },
  { code: "five-goals", name: "Sur la lancée", description: "Terminer 5 objectifs.", icon: "Flame", tier: "silver", xpReward: 150, rule: { type: "goalsCompleted", value: 5 } },
  { code: "ten-goals", name: "Mi-parcours", description: "Terminer 10 objectifs.", icon: "Mountain", tier: "gold", xpReward: 300, rule: { type: "goalsCompleted", value: 10 } },
  { code: "twenty-goals", name: "Presque au bout", description: "Terminer 20 objectifs.", icon: "Trophy", tier: "gold", xpReward: 600, rule: { type: "goalsCompleted", value: 20 } },
  { code: "quest-complete", name: "Quête accomplie", description: "Terminer les 25 objectifs de la quête.", icon: "Crown", tier: "legendary", xpReward: 2500, rule: { type: "goalsCompleted", value: 25 } },
  { code: "final-boss", name: "Ligne d'arrivée", description: "Réaliser l'objectif final.", icon: "PartyPopper", tier: "legendary", xpReward: 1500, rule: { type: "finalGoal" } },

  // ── Étapes ─────────────────────────────────────────────────────────────────
  { code: "ten-steps", name: "Mise en route", description: "Cocher 10 étapes.", icon: "ListChecks", tier: "bronze", xpReward: 40, rule: { type: "stepsCompleted", value: 10 } },
  { code: "fifty-steps", name: "Machine à cocher", description: "Cocher 50 étapes.", icon: "CheckCheck", tier: "silver", xpReward: 120, rule: { type: "stepsCompleted", value: 50 } },
  { code: "two-hundred-steps", name: "Infatigable", description: "Cocher 200 étapes.", icon: "Zap", tier: "gold", xpReward: 400, rule: { type: "stepsCompleted", value: 200 } },

  // ── Régularité ─────────────────────────────────────────────────────────────
  { code: "streak-7", name: "Une semaine pleine", description: "7 jours d'affilée.", icon: "Flame", tier: "bronze", xpReward: 60, rule: { type: "streak", value: 7 } },
  { code: "streak-30", name: "Un mois sans lâcher", description: "30 jours d'affilée.", icon: "CalendarHeart", tier: "silver", xpReward: 200, rule: { type: "streak", value: 30 } },
  { code: "streak-100", name: "Increvable", description: "100 jours d'affilée.", icon: "Infinity", tier: "gold", xpReward: 700, rule: { type: "streak", value: 100 } },
  { code: "streak-365", name: "Une année entière", description: "365 jours d'affilée.", icon: "Star", tier: "legendary", xpReward: 2000, rule: { type: "streak", value: 365 } },

  // ── Voyage ─────────────────────────────────────────────────────────────────
  { code: "first-country", name: "Premier tampon", description: "Un premier objectif réalisé à l'étranger.", icon: "Plane", tier: "bronze", xpReward: 60, rule: { type: "countries", value: 1 } },
  { code: "three-countries", name: "Globe-trotteuse", description: "Des objectifs réalisés dans 3 pays.", icon: "Globe", tier: "silver", xpReward: 180, rule: { type: "countries", value: 3 } },
  { code: "five-countries", name: "Citoyenne du monde", description: "Des objectifs réalisés dans 5 pays.", icon: "Map", tier: "gold", xpReward: 400, rule: { type: "countries", value: 5 } },

  // ── Journal ────────────────────────────────────────────────────────────────
  { code: "journal-1", name: "Chère moi", description: "Écrire ta première entrée de journal.", icon: "PenLine", tier: "bronze", xpReward: 30, rule: { type: "journalEntries", value: 1 } },
  { code: "journal-30", name: "Mémoire vive", description: "30 entrées de journal.", icon: "BookHeart", tier: "silver", xpReward: 150, rule: { type: "journalEntries", value: 30 } },
  { code: "journal-200", name: "Archiviste de ma vie", description: "200 entrées de journal.", icon: "Library", tier: "gold", xpReward: 500, rule: { type: "journalEntries", value: 200 } },

  // ── Argent ─────────────────────────────────────────────────────────────────
  { code: "saved-1000", name: "Premier millier", description: "1 000 € épargnés pour tes objectifs.", icon: "PiggyBank", tier: "bronze", xpReward: 80, rule: { type: "moneySaved", value: 1000 } },
  { code: "saved-10000", name: "Trésor de guerre", description: "10 000 € épargnés pour tes objectifs.", icon: "Gem", tier: "gold", xpReward: 500, rule: { type: "moneySaved", value: 10000 } },

  // ── Rythme de vie ──────────────────────────────────────────────────────────
  { code: "early-bird", name: "Lève-tôt", description: "20 étapes cochées avant 8 h.", icon: "Sunrise", tier: "silver", xpReward: 120, rule: { type: "earlyBird", value: 20 } },
  { code: "night-owl", name: "Oiseau de nuit", description: "20 étapes cochées après 23 h.", icon: "Moon", tier: "silver", xpReward: 120, rule: { type: "nightOwl", value: 20 } },

  // ── Expérience ─────────────────────────────────────────────────────────────
  { code: "xp-1000", name: "Elle prend de l'élan", description: "Atteindre 1 000 XP.", icon: "TrendingUp", tier: "bronze", xpReward: 0, rule: { type: "xp", value: 1000 } },
  { code: "xp-5000", name: "Force tranquille", description: "Atteindre 5 000 XP.", icon: "Award", tier: "gold", xpReward: 0, rule: { type: "xp", value: 5000 } },
];
