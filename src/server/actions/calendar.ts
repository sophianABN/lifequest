"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validations/goal";

export async function createEvent(input: unknown) {
  const userId = await requireUserId();
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }
  const data = parsed.data;

  await prisma.calendarEvent.create({
    data: {
      userId,
      goalId: data.goalId || null,
      title: data.title,
      notes: data.notes ?? null,
      start: new Date(data.start),
      end: data.end ? new Date(data.end) : null,
      allDay: data.allDay,
      kind: data.kind,
      color: data.color ?? null,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true as const };
}

/**
 * Déplace un événement (glisser-déposer dans le calendrier).
 *
 * Si l'événement provient d'une étape, la date d'échéance de l'étape suit :
 * sinon le calendrier et la fiche objectif afficheraient deux dates
 * différentes pour la même chose.
 */
export async function moveEvent(id: string, newStart: string) {
  const userId = await requireUserId();
  const event = await prisma.calendarEvent.findFirst({
    where: { id, userId },
    select: { id: true, start: true, end: true, stepId: true },
  });
  if (!event) return { ok: false as const, error: "Événement introuvable" };

  const start = new Date(newStart);
  // On conserve la durée d'origine plutôt que de tronquer l'événement.
  const duration = event.end ? event.end.getTime() - event.start.getTime() : null;

  await prisma.calendarEvent.update({
    where: { id },
    data: { start, end: duration ? new Date(start.getTime() + duration) : null },
  });

  if (event.stepId) {
    await prisma.step.update({ where: { id: event.stepId }, data: { dueDate: start } });
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function toggleEventDone(id: string) {
  const userId = await requireUserId();
  const event = await prisma.calendarEvent.findFirst({
    where: { id, userId },
    select: { done: true },
  });
  if (!event) return { ok: false as const };

  await prisma.calendarEvent.update({ where: { id }, data: { done: !event.done } });
  revalidatePath("/", "layout");
  return { ok: true as const, done: !event.done };
}

export async function deleteEvent(id: string) {
  const userId = await requireUserId();
  await prisma.calendarEvent.deleteMany({ where: { id, userId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
