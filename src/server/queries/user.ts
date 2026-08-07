import { cache } from "react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * `cache()` déduplique l'appel sur la durée d'une requête : le layout, la page
 * et plusieurs composants peuvent demander le profil sans multiplier les
 * requêtes SQL.
 */
export const getSessionUserId = cache(async () => {
  const session = await auth();
  return session?.user?.id ?? null;
});

export const getProfile = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      skills: { orderBy: { name: "asc" } },
      languages: { orderBy: { name: "asc" } },
      constraints: true,
    },
  });
});

export type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;

export const getNotifications = cache(async (take = 12) => {
  const userId = await getSessionUserId();
  if (!userId) return [];

  return prisma.notification.findMany({
    where: { userId },
    orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
    take,
  });
});

/** Citation du jour — tirée de façon déterministe côté serveur. */
export const getDailyQuote = cache(async () => {
  const quotes = await prisma.quote.findMany();
  if (quotes.length === 0) return null;

  // La graine est la date du jour : la citation reste la même toute la journée.
  const seed = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
  return quotes[Math.abs(hash) % quotes.length];
});
