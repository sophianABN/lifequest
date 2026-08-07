"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { XP } from "@/lib/constants";
import { startOfDay } from "@/lib/utils";
import { journalSchema } from "@/lib/validations/goal";
import { rewardActivity } from "@/server/gamification";

/**
 * Crée ou met à jour l'entrée du jour.
 *
 * Une seule entrée par jour (contrainte unique `userId + date`) : le journal
 * doit rester un rituel quotidien, pas un flux de notes.
 */
export async function saveJournalEntry(input: unknown) {
  const userId = await requireUserId();
  const parsed = journalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }
  const data = parsed.data;
  const date = startOfDay(new Date(data.date));

  const existing = await prisma.journalEntry.findUnique({
    where: { userId_date: { userId, date } },
    select: { id: true },
  });

  const payload = {
    whatIDid: data.whatIDid ?? null,
    whatILearned: data.whatILearned ?? null,
    notes: data.notes ?? null,
    gratitude: data.gratitude ?? null,
    mood: data.mood,
    goalId: data.goalId || null,
  };

  const entry = existing
    ? await prisma.journalEntry.update({ where: { id: existing.id }, data: payload })
    : await prisma.journalEntry.create({ data: { userId, date, ...payload } });

  if (data.photos?.length) {
    await prisma.journalPhoto.deleteMany({ where: { entryId: entry.id } });
    await prisma.journalPhoto.createMany({
      data: data.photos.map((p) => ({ entryId: entry.id, url: p.url, caption: p.caption ?? null })),
    });
  }

  // On ne récompense que la *création* : rééditer son texte ne doit pas
  // rapporter d'XP en boucle.
  let badges: { code: string; name: string; icon: string; tier: string }[] = [];
  if (!existing) {
    const result = await rewardActivity(userId, XP.JOURNAL_ENTRY, "Entrée de journal");
    badges = result.badges;
  }

  revalidatePath("/", "layout");
  return { ok: true as const, id: entry.id, badges };
}

export async function deleteJournalEntry(id: string) {
  const userId = await requireUserId();
  await prisma.journalEntry.deleteMany({ where: { id, userId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
