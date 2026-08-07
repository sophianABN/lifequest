import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Recherche globale instantanée (palette de commandes ⌘K).
 *
 * Une seule route pour tous les types de contenu : le coût d'une requête
 * réseau supplémentaire par type dépasserait largement celui de trois requêtes
 * SQL parallèles.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ results: [] }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ goals: [], steps: [], journal: [] });

  const contains = { contains: q, mode: "insensitive" as const };

  const [goals, steps, journal] = await Promise.all([
    prisma.goal.findMany({
      where: {
        userId: session.user.id,
        OR: [{ title: contains }, { description: contains }, { country: contains }, { notes: contains }],
      },
      select: { id: true, slug: true, title: true, emoji: true, color: true, status: true, progress: true },
      take: 8,
    }),
    prisma.step.findMany({
      where: { goal: { userId: session.user.id }, title: contains },
      select: { id: true, title: true, done: true, goal: { select: { slug: true, title: true, emoji: true } } },
      take: 6,
    }),
    prisma.journalEntry.findMany({
      where: {
        userId: session.user.id,
        OR: [{ whatIDid: contains }, { whatILearned: contains }, { notes: contains }],
      },
      select: { id: true, date: true, whatIDid: true },
      orderBy: { date: "desc" },
      take: 4,
    }),
  ]);

  return NextResponse.json({ goals, steps, journal });
}
