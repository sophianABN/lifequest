"use server";

import bcrypt from "bcryptjs";

import { requireUserId, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { deleteAllForUser } from "@/lib/storage";

/**
 * Supprime définitivement le compte courant et tout ce qui lui appartient.
 *
 * Exigée par l'App Store et le Play Store pour toute application qui permet
 * de créer un compte — et due à l'utilisateur de toute façon. Le mot de passe
 * est redemandé : une session restée ouverte sur un appareil prêté ne doit
 * pas suffire à tout effacer.
 *
 * Ordre des opérations : les fichiers d'abord. S'ils ne peuvent pas être
 * effacés, le compte reste intact et l'utilisateur peut réessayer ; dans
 * l'ordre inverse, ses photos resteraient dans le stockage sans plus aucun
 * moyen de les retrouver ni de les supprimer.
 *
 * En base, tout part en cascade depuis `User` (voir `schema.prisma`).
 */
export async function deleteAccount(password: string) {
  // Refuse aussi le compte de démonstration.
  const userId = await requireUserId();

  if (!rateLimit(`delete-account:${userId}`, 5, 15 * 60 * 1000).allowed) {
    return { ok: false as const, error: "Trop de tentatives. Réessaie dans un quart d'heure." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return { ok: false as const, error: "Mot de passe incorrect." };
  }

  try {
    await deleteAllForUser(userId);
  } catch {
    return {
      ok: false as const,
      error: "Tes fichiers n'ont pas pu être supprimés. Rien n'a été effacé : réessaie dans un instant.",
    };
  }

  await prisma.user.delete({ where: { id: userId } });

  // La session est un JWT : elle survivrait au compte sans ce nettoyage.
  await signOut({ redirect: false });
  return { ok: true as const };
}
