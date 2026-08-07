"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const renameSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, "Le titre ne peut pas être vide.").max(120),
});

/** Renomme une conversation depuis la liste latérale. */
export async function renameConversation(input: unknown) {
  const userId = await requireUserId();
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Titre invalide" };
  }

  // `updateMany` avec le userId dans le `where` : une conversation qui n'est
  // pas la sienne ne renvoie simplement aucune ligne modifiée.
  const { count } = await prisma.aiConversation.updateMany({
    where: { id: parsed.data.id, userId },
    data: { title: parsed.data.title },
  });
  if (count === 0) return { ok: false as const, error: "Conversation introuvable" };

  revalidatePath("/assistant");
  return { ok: true as const };
}

export async function deleteConversation(id: string) {
  const userId = await requireUserId();
  // Les messages tombent avec la conversation (onDelete: Cascade).
  await prisma.aiConversation.deleteMany({ where: { id, userId } });
  revalidatePath("/assistant");
  return { ok: true as const };
}
