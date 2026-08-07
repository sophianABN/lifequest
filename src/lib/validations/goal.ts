import { z } from "zod";

import { GOAL_COLORS } from "@/lib/constants";

/**
 * Les dates restent des chaînes `YYYY-MM-DD` dans les schémas.
 *
 * React Hook Form exige que le type d'entrée et le type de sortie du resolver
 * soient identiques : une transformation `string → Date` casserait le typage
 * de tout le formulaire. La conversion se fait donc côté Server Action, au
 * moment d'écrire en base.
 */
const optionalDate = z.string().optional().nullable();

const optionalInt = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v === "" || v == null) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  });

export const goalSchema = z.object({
  title: z.string().min(2, "Titre trop court").max(120),
  description: z.string().max(2000).optional().nullable(),
  motivation: z.string().max(1000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  emoji: z.string().max(8).optional().nullable(),
  color: z.enum(GOAL_COLORS).default("blush"),
  coverImage: z.string().url().optional().or(z.literal("")).nullable(),
  categoryId: z.string().optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "WAITING", "BLOCKED", "DONE", "ARCHIVED"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  difficulty: z.coerce.number().int().min(1).max(5).default(3),
  targetDate: optionalDate,
  startDate: optionalDate,
  estimatedCost: optionalInt,
  savedAmount: optionalInt,
  estimatedHours: optionalInt,
  country: z.string().max(60).optional().nullable(),
  city: z.string().max(60).optional().nullable(),
  minAge: optionalInt,
  isFavorit: z.boolean().default(false),
  personIds: z.array(z.string()).optional(),
});

export type GoalInput = z.input<typeof goalSchema>;
export type GoalOutput = z.output<typeof goalSchema>;

export const stepSchema = z.object({
  goalId: z.string(),
  parentId: z.string().optional().nullable(),
  title: z.string().min(1, "Titre requis").max(200),
  description: z.string().max(1000).optional().nullable(),
  dueDate: optionalDate,
  reminderAt: optionalDate,
  estimatedMinutes: optionalInt,
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
});

export type StepInput = z.input<typeof stepSchema>;

export const journalSchema = z.object({
  date: z.string(),
  whatIDid: z.string().max(3000).optional().nullable(),
  whatILearned: z.string().max(3000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  gratitude: z.string().max(1000).optional().nullable(),
  mood: z.enum(["AWFUL", "BAD", "NEUTRAL", "GOOD", "GREAT"]).default("NEUTRAL"),
  goalId: z.string().optional().nullable(),
  photos: z.array(z.object({ url: z.string().url(), caption: z.string().optional() })).optional(),
});

export type JournalInput = z.input<typeof journalSchema>;

export const eventSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(1000).optional().nullable(),
  start: z.string(),
  end: z.string().optional().nullable(),
  allDay: z.boolean().default(true),
  kind: z.enum(["TASK", "MILESTONE", "REMINDER", "EVENT"]).default("EVENT"),
  color: z.string().optional().nullable(),
  goalId: z.string().optional().nullable(),
});

export type EventInput = z.input<typeof eventSchema>;

export const profileSchema = z.object({
  name: z.string().min(2).max(50),
  bio: z.string().max(500).optional().nullable(),
  image: z.string().url().optional().or(z.literal("")).nullable(),
  birthDate: z.string().optional().nullable(),
  deadlineDate: z.string().optional().nullable(),
  questTitle: z.string().min(2).max(120),
  city: z.string().max(60).optional().nullable(),
  country: z.string().max(60).optional().nullable(),
  schoolLevel: z.string().max(80).optional().nullable(),
  freeHoursWeekly: z.coerce.number().int().min(0).max(120),
  monthlySavings: z.coerce.number().int().min(0).max(100000),
  availableBudget: z.coerce.number().int().min(0).max(10000000),
});

export type ProfileInput = z.input<typeof profileSchema>;
