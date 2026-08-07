import type { Metadata } from "next";
import { Suspense } from "react";
import { Target } from "lucide-react";

import { getCategories, getGoals, getPeople, getScorableGoals, getUserContext } from "@/server/queries/goals";
import { analyzeAll } from "@/lib/intelligence/engine";
import { PageHeader } from "@/components/shared/page-header";
import { GoalsExplorer, type ExplorerGoal } from "@/components/goals/goals-explorer";
import { Skeleton } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Objectifs" };

export default async function GoalsPage() {
  const [goals, scorable, context, categories, people] = await Promise.all([
    getGoals(),
    getScorableGoals(),
    getUserContext(),
    getCategories(),
    getPeople(),
  ]);

  const { byId } = context ? analyzeAll(scorable, context) : { byId: new Map() };

  const items: ExplorerGoal[] = goals.map((goal) => {
    const analysis = byId.get(goal.id);
    return { goal, score: analysis?.score ?? 0, readiness: analysis?.readiness ?? "READY" };
  });

  const done = goals.filter((g) => g.status === "DONE").length;

  return (
    <div>
      <PageHeader
        title="Mes objectifs"
        icon={<Target className="size-7 text-blush-500" />}
        description={
          <>
            {done} objectif{done > 1 ? "s" : ""} réalisé{done > 1 ? "s" : ""} sur {goals.length}. Le tri
            intelligent place en tête ce qui est réalisable maintenant, en tenant compte de ton budget,
            de ton temps et de la saison.
          </>
        }
      />

      {/* `useSearchParams` dans l'explorateur impose une frontière Suspense. */}
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-3xl" />}>
        <GoalsExplorer items={items} categories={categories} people={people} />
      </Suspense>
    </div>
  );
}
