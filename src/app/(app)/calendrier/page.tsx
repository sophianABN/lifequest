import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getProfile } from "@/server/queries/user";
import { getGoals } from "@/server/queries/goals";
import { PageHeader } from "@/components/shared/page-header";
import { CalendarView, type CalendarItem } from "@/components/calendar/calendar-view";

export const metadata: Metadata = { title: "Calendrier" };

export default async function CalendarPage() {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");

  // On charge une fenêtre large (± 1 an) : le calendrier filtre ensuite en
  // mémoire, ce qui rend la navigation entre mois instantanée.
  const from = new Date();
  from.setFullYear(from.getFullYear() - 1);
  const to = new Date();
  to.setFullYear(to.getFullYear() + 2);

  const [events, goals] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { userId: profile.id, start: { gte: from, lte: to } },
      orderBy: { start: "asc" },
      include: { goal: { select: { slug: true, title: true } } },
    }),
    getGoals(),
  ]);

  const items: CalendarItem[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    notes: e.notes,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    kind: e.kind,
    color: e.color,
    done: e.done,
    goalSlug: e.goal?.slug ?? null,
    goalTitle: e.goal?.title ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Calendrier"
        icon={<CalendarDays className="size-7 text-aqua-500" />}
        description="Jour, semaine, mois, année. Déplace une tâche par glisser-déposer : l'étape correspondante suit automatiquement."
      />

      <CalendarView
        items={items}
        goals={goals
          .filter((g) => g.status !== "DONE" && g.status !== "ARCHIVED")
          .map((g) => ({ id: g.id, title: g.title, emoji: g.emoji, color: g.color }))}
      />
    </div>
  );
}
