"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { XP } from "@/lib/constants";
import { stepSchema } from "@/lib/validations/goal";
import { recomputeGoalProgress } from "@/server/progress";
import { rewardActivity } from "@/server/gamification";

/** Vérifie que l'étape appartient bien à l'utilisateur connecté. */
async function ownedStep(userId: string, stepId: string) {
  return prisma.step.findFirst({
    where: { id: stepId, goal: { userId } },
    select: { id: true, goalId: true, done: true, parentId: true, title: true },
  });
}

export async function createStep(input: unknown) {
  const userId = await requireUserId();
  const parsed = stepSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const goal = await prisma.goal.findFirst({
    where: { id: parsed.data.goalId, userId },
    select: { id: true, color: true },
  });
  if (!goal) return { ok: false as const, error: "Objectif introuvable" };

  const last = await prisma.step.findFirst({
    where: { goalId: goal.id, parentId: parsed.data.parentId ?? null },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const step = await prisma.step.create({
    data: { ...parsed.data, order: (last?.order ?? -1) + 1 },
  });

  // Une étape datée apparaît automatiquement dans le calendrier : sans cela,
  // l'utilisateur devrait saisir la même information deux fois.
  if (step.dueDate) {
    await prisma.calendarEvent.create({
      data: {
        userId,
        goalId: goal.id,
        stepId: step.id,
        title: step.title,
        start: step.dueDate,
        allDay: true,
        kind: "TASK",
        color: goal.color,
      },
    });
  }

  await recomputeGoalProgress(goal.id);
  revalidatePath("/", "layout");
  return { ok: true as const, id: step.id };
}

export async function updateStep(id: string, input: unknown) {
  const userId = await requireUserId();
  const step = await ownedStep(userId, id);
  if (!step) return { ok: false as const, error: "Étape introuvable" };

  const parsed = stepSchema.omit({ goalId: true }).partial().safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const updated = await prisma.step.update({ where: { id }, data: parsed.data });

  // L'événement de calendrier suit l'étape (créé, déplacé ou supprimé).
  if (parsed.data.dueDate !== undefined) {
    if (updated.dueDate) {
      const existing = await prisma.calendarEvent.findFirst({ where: { stepId: id } });
      if (existing) {
        await prisma.calendarEvent.update({
          where: { id: existing.id },
          data: { start: updated.dueDate, title: updated.title },
        });
      } else {
        await prisma.calendarEvent.create({
          data: {
            userId,
            goalId: updated.goalId,
            stepId: id,
            title: updated.title,
            start: updated.dueDate,
            allDay: true,
            kind: "TASK",
          },
        });
      }
    } else {
      await prisma.calendarEvent.deleteMany({ where: { stepId: id } });
    }
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}

/**
 * Coche / décoche une étape.
 *
 * Cocher un parent coche toutes ses sous-étapes : c'est le geste attendu, et
 * l'inverse (parent coché avec des enfants ouverts) rendrait la progression
 * incohérente.
 */
export async function toggleStep(id: string) {
  const userId = await requireUserId();
  const step = await ownedStep(userId, id);
  if (!step) return { ok: false as const, error: "Étape introuvable" };

  const done = !step.done;
  const completedAt = done ? new Date() : null;

  await prisma.$transaction([
    prisma.step.update({ where: { id }, data: { done, completedAt } }),
    prisma.step.updateMany({ where: { parentId: id }, data: { done, completedAt } }),
    prisma.calendarEvent.updateMany({ where: { stepId: id }, data: { done } }),
  ]);

  // Si toutes les sœurs sont cochées, le parent l'est aussi.
  if (step.parentId) {
    const siblings = await prisma.step.findMany({
      where: { parentId: step.parentId },
      select: { done: true },
    });
    const allDone = siblings.every((s) => s.done);
    await prisma.step.update({
      where: { id: step.parentId },
      data: { done: allDone, completedAt: allDone ? new Date() : null },
    });
  }

  const progress = await recomputeGoalProgress(step.goalId);

  let badges: { code: string; name: string; icon: string; tier: string }[] = [];
  if (done) {
    const result = await rewardActivity(
      userId,
      step.parentId ? XP.SUBSTEP_DONE : XP.STEP_DONE,
      `Étape terminée : ${step.title}`,
      step.goalId,
    );
    badges = result.badges;
  }

  // Un objectif dont toutes les étapes sont cochées bascule en « en cours »
  // plutôt qu'en « terminé » : la décision finale reste à l'utilisateur.
  if (done && progress > 0) {
    await prisma.goal.updateMany({
      where: { id: step.goalId, status: "TODO" },
      data: { status: "IN_PROGRESS", startDate: new Date() },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true as const, done, progress, badges };
}

export async function deleteStep(id: string) {
  const userId = await requireUserId();
  const step = await ownedStep(userId, id);
  if (!step) return { ok: false as const, error: "Étape introuvable" };

  await prisma.step.delete({ where: { id } });
  await recomputeGoalProgress(step.goalId);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Réordonne les étapes d'un même niveau (glisser-déposer). */
export async function reorderSteps(goalId: string, parentId: string | null, orderedIds: string[]) {
  const userId = await requireUserId();
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId }, select: { id: true } });
  if (!goal) return { ok: false as const };

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.step.updateMany({ where: { id, goalId, parentId }, data: { order: index } }),
    ),
  );
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Crée plusieurs étapes d'un coup — utilisé par l'assistant IA. */
export async function createStepsBulk(
  goalId: string,
  steps: { title: string; description?: string; estimatedMinutes?: number; dueDate?: string | null }[],
) {
  const userId = await requireUserId();
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId }, select: { id: true } });
  if (!goal) return { ok: false as const, error: "Objectif introuvable" };

  const last = await prisma.step.findFirst({
    where: { goalId, parentId: null },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const start = (last?.order ?? -1) + 1;

  await prisma.step.createMany({
    data: steps.map((s, i) => ({
      goalId,
      title: s.title,
      description: s.description,
      estimatedMinutes: s.estimatedMinutes,
      dueDate: s.dueDate ? new Date(s.dueDate) : null,
      order: start + i,
    })),
  });

  await recomputeGoalProgress(goalId);
  revalidatePath("/", "layout");
  return { ok: true as const, created: steps.length };
}

// ─── Checklist ───────────────────────────────────────────────────────────────

export async function addChecklistItem(goalId: string, label: string) {
  const userId = await requireUserId();
  if (!label.trim()) return { ok: false as const };
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId }, select: { id: true } });
  if (!goal) return { ok: false as const };

  const last = await prisma.checklistItem.findFirst({
    where: { goalId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await prisma.checklistItem.create({
    data: { goalId, label: label.trim(), order: (last?.order ?? -1) + 1 },
  });

  await recomputeGoalProgress(goalId);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function toggleChecklistItem(id: string) {
  const userId = await requireUserId();
  const item = await prisma.checklistItem.findFirst({
    where: { id, goal: { userId } },
    select: { id: true, done: true, goalId: true, label: true },
  });
  if (!item) return { ok: false as const };

  await prisma.checklistItem.update({ where: { id }, data: { done: !item.done } });
  const progress = await recomputeGoalProgress(item.goalId);

  if (!item.done) {
    await rewardActivity(userId, XP.CHECKLIST_DONE, `Checklist : ${item.label}`, item.goalId);
  }

  revalidatePath("/", "layout");
  return { ok: true as const, done: !item.done, progress };
}

export async function deleteChecklistItem(id: string) {
  const userId = await requireUserId();
  const item = await prisma.checklistItem.findFirst({
    where: { id, goal: { userId } },
    select: { goalId: true },
  });
  if (!item) return { ok: false as const };

  await prisma.checklistItem.delete({ where: { id } });
  await recomputeGoalProgress(item.goalId);
  revalidatePath("/", "layout");
  return { ok: true as const };
}
