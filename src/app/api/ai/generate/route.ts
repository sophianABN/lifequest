import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProfile } from "@/server/queries/user";
import { getScorableGoals, getUserContext } from "@/server/queries/goals";
import {
  ANTHROPIC_MODEL,
  MISTRAL_MODEL,
  getAnthropic,
  getMistralKey,
  getProvider,
} from "@/lib/ai/client";
import { completeMistral } from "@/lib/ai/mistral";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { generateBudgetPlan, generateSteps, generateWeeklyPlan, type GeneratedStep } from "@/lib/ai/generators";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Schéma imposé au modèle : garantit un JSON directement exploitable.
 *
 * Toutes les propriétés sont déclarées `required` — le mode strict de Mistral
 * comme celui d'Anthropic l'exigent. Les valeurs superflues sont filtrées à la
 * lecture.
 */
const STEPS_SCHEMA = {
  type: "object",
  properties: {
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          estimatedMinutes: { type: "integer" },
          offsetDays: { type: "integer" },
        },
        required: ["title", "description", "estimatedMinutes", "offsetDays"],
        additionalProperties: false,
      },
    },
  },
  required: ["steps"],
  additionalProperties: false,
} as const;

/** Extrait le tableau d'étapes d'une réponse texte, `[]` si inexploitable. */
function parseSteps(text: string | null): GeneratedStep[] {
  if (!text?.trim()) return [];
  try {
    const parsed = JSON.parse(text) as { steps?: GeneratedStep[] };
    return parsed.steps?.filter((s) => s.title?.trim()) ?? [];
  } catch {
    return [];
  }
}

/**
 * Génération structurée : étapes, planning ou budget.
 *
 * Contrairement à la conversation, on renvoie ici du JSON exploitable par
 * l'interface (pré-visualisation avant insertion en base). Le moteur
 * déterministe fournit exactement la même forme de réponse.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { kind, goalId } = (await request.json()) as {
    kind: "steps" | "plan" | "budget";
    goalId?: string;
  };

  const [profile, goals, ctx] = await Promise.all([
    getProfile(),
    getScorableGoals(),
    getUserContext(),
  ]);
  if (!profile || !ctx) return NextResponse.json({ error: "Profil introuvable" }, { status: 400 });

  // ── Planning hebdomadaire : toujours déterministe ────────────────────────
  // Répartir des heures dans une semaine est un calcul, pas une question de
  // langage — le faire faire par un modèle serait plus lent et moins fiable.
  if (kind === "plan") {
    return NextResponse.json({ mode: "engine", plan: generateWeeklyPlan(goals, ctx) });
  }

  const goal = goalId ? goals.find((g) => g.id === goalId) : null;
  if (!goal) return NextResponse.json({ error: "Objectif introuvable" }, { status: 404 });

  if (kind === "budget") {
    return NextResponse.json({ mode: "engine", budget: generateBudgetPlan(goal, ctx) });
  }

  // ── Étapes ───────────────────────────────────────────────────────────────
  const dbGoal = await prisma.goal.findFirst({
    where: { id: goal.id, userId: session.user.id },
    select: { title: true, description: true, targetDate: true, estimatedCost: true, country: true, category: { select: { slug: true } } },
  });
  if (!dbGoal) return NextResponse.json({ error: "Objectif introuvable" }, { status: 404 });

  const fallback = (): GeneratedStep[] =>
    generateSteps({
      title: dbGoal.title,
      category: dbGoal.category?.slug ?? null,
      country: dbGoal.country,
      targetDate: dbGoal.targetDate,
      estimatedCost: dbGoal.estimatedCost,
    });

  const provider = getProvider();
  if (!provider) return NextResponse.json({ mode: "engine", steps: fallback() });

  const system = buildSystemPrompt({ name: profile.name, ctx, goals, focusGoalId: goal.id });
  const prompt = `Découpe l'objectif « ${dbGoal.title} » en 4 à 8 étapes concrètes, dans l'ordre chronologique.
${dbGoal.description ? `Contexte : ${dbGoal.description}` : ""}
${dbGoal.targetDate ? `Date cible : ${dbGoal.targetDate.toISOString().slice(0, 10)} — répartis les étapes jusqu'à cette date via offsetDays (nombre de jours à partir d'aujourd'hui).` : ""}
${dbGoal.estimatedCost ? `Budget estimé : ${dbGoal.estimatedCost} €.` : ""}
Chaque étape doit être réalisable en une session de travail et commencer par un verbe à l'infinitif.`;

  try {
    let steps: GeneratedStep[] = [];

    if (provider === "mistral") {
      const apiKey = getMistralKey();
      if (!apiKey) return NextResponse.json({ mode: "engine", steps: fallback() });

      const text = await completeMistral({
        apiKey,
        model: MISTRAL_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        jsonSchema: { name: "etapes", schema: STEPS_SCHEMA },
      });
      steps = parseSteps(text);
    } else {
      const anthropic = getAnthropic();
      if (!anthropic) return NextResponse.json({ mode: "engine", steps: fallback() });

      const response = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: STEPS_SCHEMA },
        },
        system,
        messages: [{ role: "user", content: prompt }],
      });

      if (response.stop_reason !== "refusal") {
        const text = response.content.find((b) => b.type === "text");
        steps = parseSteps(text?.text ?? null);
      }
    }

    return NextResponse.json({
      mode: steps.length > 0 ? "ai" : "engine",
      steps: steps.length > 0 ? steps : fallback(),
    });
  } catch {
    // Réseau, quota, format inattendu : le moteur local prend le relais.
    return NextResponse.json({ mode: "engine", steps: fallback() });
  }
}
