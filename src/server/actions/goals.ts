"use server";

import { revalidatePath } from "next/cache";
import type { GoalStatus } from "@prisma/client";

import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { deleteByUrl } from "@/lib/storage";
import { XP } from "@/lib/constants";
import { goalSchema, type GoalOutput } from "@/lib/validations/goal";
import { recomputeGoalProgress } from "@/server/progress";
import { rewardActivity } from "@/server/gamification";

/* ═══════════════════════════════════════════════════════════════════════════
   ACTIONS SUR LES OBJECTIFS
   Chaque action suit le même contrat :
     1. authentifier   2. valider (Zod)   3. écrire   4. revalider les vues
   Le `userId` fait toujours partie du `where` : impossible de toucher les
   données d'un autre compte même en devinant un identifiant.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Génère un slug unique pour l'utilisateur (`camp-boxe`, `camp-boxe-2`, …). */
async function uniqueSlug(userId: string, title: string, currentId?: string) {
  const base = slugify(title) || "objectif";
  let slug = base;
  let n = 1;
  while (true) {
    const existing = await prisma.goal.findFirst({
      where: { userId, slug, ...(currentId ? { NOT: { id: currentId } } : {}) },
      select: { id: true },
    });
    if (!existing) return slug;
    slug = `${base}-${++n}`;
  }
}

/** Convertit les chaînes de date du formulaire en `Date`, ou `null`. */
function toDate(value: string | null | undefined) {
  if (value === undefined) return undefined;
  return value ? new Date(value) : null;
}

/** Traduit la sortie du schéma Zod en champs Prisma scalaires. */
function toGoalFields(data: Omit<GoalOutput, "personIds">) {
  return {
    title: data.title,
    description: data.description ?? null,
    motivation: data.motivation ?? null,
    notes: data.notes ?? null,
    emoji: data.emoji ?? null,
    color: data.color,
    coverImage: data.coverImage || null,
    categoryId: data.categoryId ?? null,
    status: data.status,
    priority: data.priority,
    difficulty: data.difficulty,
    targetDate: toDate(data.targetDate),
    startDate: toDate(data.startDate),
    estimatedCost: data.estimatedCost,
    // Colonne non nullable en base : le formulaire peut renvoyer `null`.
    savedAmount: data.savedAmount ?? 0,
    estimatedHours: data.estimatedHours,
    country: data.country ?? null,
    city: data.city ?? null,
    minAge: data.minAge,
    isFavorit: data.isFavorit,
  };
}

export async function createGoal(input: unknown) {
  const userId = await requireUserId();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }
  const { personIds, ...data } = parsed.data;

  const last = await prisma.goal.findFirst({
    where: { userId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const goal = await prisma.goal.create({
    data: {
      ...toGoalFields(data),
      userId,
      slug: await uniqueSlug(userId, data.title),
      order: (last?.order ?? 0) + 1,
    },
  });

  if (personIds?.length) {
    await prisma.goalPerson.createMany({
      data: personIds.map((personId) => ({ goalId: goal.id, personId })),
      skipDuplicates: true,
    });
  }

  await rewardActivity(userId, XP.GOAL_CREATED, `Objectif créé : ${goal.title}`, goal.id);

  revalidatePath("/", "layout");
  return { ok: true as const, slug: goal.slug };
}

export async function updateGoal(id: string, input: unknown) {
  const userId = await requireUserId();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const existing = await prisma.goal.findFirst({ where: { id, userId }, select: { id: true, title: true } });
  if (!existing) return { ok: false as const, error: "Objectif introuvable" };

  const { personIds, ...data } = parsed.data;

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...toGoalFields(data),
      // Le slug ne suit le titre que si celui-ci change réellement : les liens
      // déjà partagés continuent de fonctionner le reste du temps.
      slug: data.title !== existing.title ? await uniqueSlug(userId, data.title, id) : undefined,
    },
  });

  // Les personnes impliquées sont remplacées en bloc — la liste envoyée par
  // le formulaire fait foi.
  if (personIds) {
    await prisma.goalPerson.deleteMany({ where: { goalId: id } });
    if (personIds.length > 0) {
      await prisma.goalPerson.createMany({
        data: personIds.map((personId) => ({ goalId: id, personId })),
        skipDuplicates: true,
      });
    }
  }

  revalidatePath("/", "layout");
  return { ok: true as const, slug: goal.slug };
}

export async function deleteGoal(id: string) {
  const userId = await requireUserId();
  await prisma.goal.deleteMany({ where: { id, userId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Change le statut (utilisé par le Kanban en glisser-déposer). */
export async function setGoalStatus(id: string, status: GoalStatus) {
  const userId = await requireUserId();
  const goal = await prisma.goal.findFirst({
    where: { id, userId },
    select: { id: true, title: true, status: true, isFinal: true },
  });
  if (!goal) return { ok: false as const, error: "Objectif introuvable" };

  const justCompleted = status === "DONE" && goal.status !== "DONE";

  await prisma.goal.update({
    where: { id },
    data: {
      status,
      completedAt: status === "DONE" ? new Date() : null,
      // Un objectif marqué terminé passe à 100 % même si des étapes restent
      // décochées : c'est l'utilisateur qui décide qu'il est fini.
      progress: status === "DONE" ? 100 : undefined,
    },
  });

  if (status !== "DONE") await recomputeGoalProgress(id);

  let badges: { code: string; name: string; icon: string; tier: string }[] = [];
  if (justCompleted) {
    const result = await rewardActivity(
      userId,
      goal.isFinal ? XP.FINAL_GOAL_DONE : XP.GOAL_DONE,
      `Objectif terminé : ${goal.title}`,
      id,
    );
    badges = result.badges;
  }

  revalidatePath("/", "layout");
  return { ok: true as const, justCompleted, isFinal: goal.isFinal, badges };
}

/** Réordonne les objectifs (glisser-déposer dans la liste et le Kanban). */
export async function reorderGoals(orderedIds: string[]) {
  const userId = await requireUserId();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.goal.updateMany({ where: { id, userId }, data: { order: index } }),
    ),
  );
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function toggleFavorite(id: string) {
  const userId = await requireUserId();
  const goal = await prisma.goal.findFirst({ where: { id, userId }, select: { isFavorit: true } });
  if (!goal) return { ok: false as const };
  await prisma.goal.update({ where: { id }, data: { isFavorit: !goal.isFavorit } });
  revalidatePath("/", "layout");
  return { ok: true as const, isFavorit: !goal.isFavorit };
}

/** Met à jour le montant épargné pour un objectif. */
export async function updateSavedAmount(id: string, amount: number) {
  const userId = await requireUserId();
  const goal = await prisma.goal.findFirst({ where: { id, userId }, select: { savedAmount: true, title: true } });
  if (!goal) return { ok: false as const, error: "Objectif introuvable" };

  const clean = Math.max(0, Math.round(amount));
  await prisma.goal.update({ where: { id }, data: { savedAmount: clean } });

  // On récompense la progression de l'épargne, pas le montant total.
  const delta = clean - goal.savedAmount;
  if (delta > 0) {
    await rewardActivity(
      userId,
      Math.floor(delta / 100) * XP.MONEY_SAVED_PER_100,
      `Épargne : ${goal.title}`,
      id,
    );
  }

  revalidatePath("/", "layout");
  return { ok: true as const, savedAmount: clean };
}

// ─── Commentaires & pièces jointes ───────────────────────────────────────────

export async function addComment(goalId: string, body: string) {
  const userId = await requireUserId();
  if (!body.trim()) return { ok: false as const, error: "Commentaire vide" };

  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId }, select: { id: true } });
  if (!goal) return { ok: false as const, error: "Objectif introuvable" };

  await prisma.comment.create({ data: { goalId, userId, body: body.trim() } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteComment(id: string) {
  const userId = await requireUserId();
  await prisma.comment.deleteMany({ where: { id, userId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function addAttachment(
  goalId: string,
  input: { name: string; url: string; type: "DOCUMENT" | "PHOTO" | "LINK" },
) {
  const userId = await requireUserId();
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId }, select: { id: true } });
  if (!goal) return { ok: false as const, error: "Objectif introuvable" };

  await prisma.attachment.create({ data: { goalId, ...input } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteAttachment(id: string) {
  const userId = await requireUserId();
  // On relit l'URL avant de supprimer la ligne : c'est elle qui porte la clé
  // de l'objet à retirer du stockage. Un lien externe n'est pas concerné.
  const attachment = await prisma.attachment.findFirst({
    where: { id, goal: { userId } },
    select: { url: true },
  });
  if (!attachment) return { ok: true as const };

  await prisma.attachment.deleteMany({ where: { id, goal: { userId } } });
  await deleteByUrl(attachment.url, userId);

  revalidatePath("/", "layout");
  return { ok: true as const };
}
