import Link from "next/link";
import { ArrowRight, Lightbulb, Target } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DoodleArrow, Sparkle } from "@/components/shared/decorations";
import { colorClasses, READINESS_CONFIG } from "@/lib/constants";
import { cn, relativeTime } from "@/lib/utils";
import type { GoalAnalysis } from "@/lib/intelligence/types";
import type { GoalListItem } from "@/server/queries/goals";

/**
 * « Que dois-je faire aujourd'hui ? » — la réponse du moteur d'intelligence,
 * accompagnée de la raison du choix. Une recommandation sans justification
 * n'est pas suivie ; on affiche donc toujours le pourquoi.
 */
export function TodayFocus({
  goal,
  analysis,
  nextStep,
}: {
  goal: GoalListItem;
  analysis: GoalAnalysis;
  nextStep: { id: string; title: string } | null;
}) {
  const colors = colorClasses(goal.color);

  return (
    <Card variant="gradient" className="relative overflow-hidden">
      <div className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", colors.gradient)} />

      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blush-600 dark:text-blush-300">
          <Sparkle size={13} />
          Aujourd&apos;hui, concentre-toi sur
        </div>

        <div className="mt-4 flex flex-wrap items-start gap-4">
          <span className={cn("grid size-14 shrink-0 place-items-center rounded-3xl text-2xl", colors.softBg)}>
            {goal.emoji ?? "🎯"}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl leading-tight">{goal.title}</h2>
            {goal.description && (
              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={READINESS_CONFIG[analysis.readiness].color}>
                {READINESS_CONFIG[analysis.readiness].label}
              </Badge>
              <Badge variant="muted">Score {analysis.score}/100</Badge>
              {goal.targetDate && <Badge variant="outline">Échéance {relativeTime(goal.targetDate)}</Badge>}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-baseline justify-between text-xs text-muted-foreground">
            <span>Progression</span>
            <span className="font-bold tabular-nums text-foreground">{goal.progress} %</span>
          </div>
          <Progress value={goal.progress} color={goal.color} />
        </div>

        {/* La prochaine action concrète */}
        {(nextStep || analysis.nextActions.length > 0) && (
          <div className="mt-5 rounded-2xl bg-muted/60 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Lightbulb className="size-3.5" /> La prochaine action
            </p>

            {nextStep ? (
              <p className="mt-1.5 font-semibold">{nextStep.title}</p>
            ) : (
              <p className="mt-1.5 font-semibold">{analysis.nextActions[0]?.label}</p>
            )}

            {analysis.nextActions[0] && (
              <p className="mt-1 text-sm text-muted-foreground">{analysis.nextActions[0].reason}</p>
            )}
          </div>
        )}

        {/* Pourquoi cet objectif ? */}
        {analysis.bestWindow && (
          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <Target className="mt-0.5 size-3.5 shrink-0 text-aqua-500" />
            {analysis.bestWindow}
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Button asChild>
            <Link href={`/objectifs/${goal.slug}`}>
              Ouvrir l&apos;objectif <ArrowRight />
            </Link>
          </Button>
          <DoodleArrow className="hidden w-20 -scale-y-100 text-blush-300 sm:block dark:text-blush-500/60" />
        </div>
      </div>
    </Card>
  );
}
