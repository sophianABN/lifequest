import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Waypoints } from "lucide-react";

import { getProfile } from "@/server/queries/user";
import { getGoals } from "@/server/queries/goals";
import { getAge } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Timeline, TimelineSummary, type TimelineGoal, type TimelineNode } from "@/components/timeline/timeline";

export const metadata: Metadata = { title: "Timeline" };

export default async function TimelinePage() {
  const [profile, goals] = await Promise.all([getProfile(), getGoals()]);
  if (!profile) redirect("/connexion");

  const now = new Date();
  const currentAge = getAge(profile.birthDate, now);
  const birthYear = profile.birthDate?.getFullYear() ?? now.getFullYear() - (currentAge ?? 0);

  const toTimelineGoal = (g: (typeof goals)[number]): TimelineGoal => ({
    id: g.id,
    slug: g.slug,
    title: g.title,
    emoji: g.emoji,
    color: g.color,
    status: g.status,
    progress: g.progress,
    targetDate: g.targetDate,
    completedAt: g.completedAt,
    estimatedCost: g.estimatedCost,
    isFinal: g.isFinal,
  });

  // Un objectif terminé se place à sa date de réalisation, pas à sa date cible :
  // la frise doit raconter ce qui s'est vraiment passé.
  const dated = goals
    .map(toTimelineGoal)
    .filter((g) => g.completedAt ?? g.targetDate)
    .map((g) => ({ goal: g, date: (g.completedAt ?? g.targetDate)! }));

  const undated = goals.map(toTimelineGoal).filter((g) => !g.completedAt && !g.targetDate);

  // Bornes de la frise : de la première année concernée à l'échéance de la quête.
  const years = dated.map((d) => d.date.getFullYear());
  const deadlineYear = profile.deadlineDate?.getFullYear() ?? now.getFullYear() + 3;
  const firstYear = Math.min(now.getFullYear(), ...(years.length ? years : [now.getFullYear()]));
  const lastYear = Math.max(deadlineYear, ...(years.length ? years : [deadlineYear]));

  const nodes: TimelineNode[] = [];
  for (let year = firstYear; year <= lastYear; year++) {
    nodes.push({
      year,
      age: year - birthYear,
      isPast: year < now.getFullYear(),
      isCurrent: year === now.getFullYear(),
      goals: dated.filter((d) => d.date.getFullYear() === year).map((d) => d.goal),
    });
  }

  const completed = goals.filter((g) => g.status === "DONE").length;

  return (
    <div>
      <PageHeader
        title="Ma frise"
        icon={<Waypoints className="size-7 text-lilac-500" />}
        description="Tes objectifs répartis année par année, de ton âge actuel jusqu'à l'échéance de la quête."
      />

      <TimelineSummary
        currentAge={currentAge}
        deadlineAge={profile.deadlineDate ? profile.deadlineDate.getFullYear() - birthYear : null}
        completed={completed}
        total={goals.length}
      />

      <Timeline nodes={nodes} undated={undated} />
    </div>
  );
}
