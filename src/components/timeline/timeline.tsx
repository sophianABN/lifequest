"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CheckCircle2, Flag, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkle } from "@/components/shared/decorations";
import { colorClasses } from "@/lib/constants";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export interface TimelineGoal {
  id: string;
  slug: string;
  title: string;
  emoji: string | null;
  color: string;
  status: string;
  progress: number;
  targetDate: Date | null;
  completedAt: Date | null;
  estimatedCost: number | null;
  isFinal: boolean;
}

export interface TimelineNode {
  /** Âge atteint cette année-là */
  age: number;
  year: number;
  isPast: boolean;
  isCurrent: boolean;
  goals: TimelineGoal[];
}

/**
 * Frise chronologique par âge.
 *
 * L'axe est l'âge et non l'année : « à 22 ans » raconte quelque chose que
 * « en 2028 » ne raconte pas, et c'est la promesse même de la quête.
 */
export function Timeline({ nodes, undated }: { nodes: TimelineNode[]; undated: TimelineGoal[] }) {
  return (
    <div className="space-y-8">
      <ol className="relative">
        {/* Le trait vertical de la frise */}
        <span
          aria-hidden
          className="absolute left-[1.6rem] top-4 bottom-4 w-0.5 rounded-full bg-gradient-to-b from-blush-300 via-lilac-300 to-aqua-300 sm:left-[2.35rem]"
        />

        {nodes.map((node, index) => (
          <motion.li
            key={node.age}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.4) }}
            className="relative pb-8 pl-16 sm:pl-24"
          >
            {/* Pastille d'âge */}
            <div
              className={cn(
                "absolute left-0 top-0 grid size-14 place-items-center rounded-2xl border-4 border-background text-center shadow-soft sm:size-[4.7rem]",
                node.isCurrent
                  ? "bg-gradient-to-br from-blush-400 to-lilac-400 text-white shadow-glow-blush"
                  : node.isPast
                    ? "bg-aqua-100 text-aqua-800 dark:bg-aqua-900/60 dark:text-aqua-100"
                    : "bg-card text-muted-foreground",
              )}
            >
              <div>
                <p className="font-display text-lg leading-none sm:text-2xl">{node.age}</p>
                <p className="text-[0.55rem] uppercase tracking-wide sm:text-[0.6rem]">ans</p>
              </div>
            </div>

            <div className="pt-2">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg">
                  {node.year}
                  {node.isCurrent && (
                    <span className="ml-2 text-sm font-normal text-blush-600 dark:text-blush-300">
                      · tu es ici
                    </span>
                  )}
                </h3>
                {node.goals.length > 0 && (
                  <Badge variant="muted">
                    {node.goals.length} objectif{node.goals.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              {node.goals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun objectif daté sur cette année — de la place pour l&apos;imprévu.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {node.goals.map((goal) => (
                    <TimelineCard key={goal.id} goal={goal} />
                  ))}
                </div>
              )}
            </div>
          </motion.li>
        ))}
      </ol>

      {undated.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 font-display text-lg">
            <Flag className="size-4 text-muted-foreground" /> Sans date cible
          </h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Ces objectifs n&apos;ont pas encore de place sur la frise. Donne-leur une date pour
            qu&apos;ils deviennent réels.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {undated.map((goal) => (
              <TimelineCard key={goal.id} goal={goal} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TimelineCard({ goal }: { goal: TimelineGoal }) {
  const colors = colorClasses(goal.color);
  const done = goal.status === "DONE";

  return (
    <Link href={`/objectifs/${goal.slug}`} className="group block">
      <Card
        interactive
        className={cn("h-full p-3.5", goal.isFinal && "border-gradient shadow-glow-gold")}
      >
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl text-base transition-transform group-hover:scale-110",
              colors.softBg,
            )}
          >
            {goal.emoji ?? "🎯"}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "line-clamp-2 text-sm font-medium leading-snug",
                done && "text-muted-foreground line-through",
              )}
            >
              {goal.title}
            </p>
            {goal.isFinal && (
              <span className="mt-0.5 flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wide text-gold-600 dark:text-gold-300">
                <Sparkle size={9} /> Objectif final
              </span>
            )}
          </div>
          {done && <CheckCircle2 className="size-4 shrink-0 text-aqua-500" />}
        </div>

        <Progress value={goal.progress} color={goal.color} size="sm" className="mt-2.5" />

        <div className="mt-2 flex items-center justify-between text-[0.7rem] text-muted-foreground">
          <span>{goal.targetDate ? formatDate(goal.targetDate) : "—"}</span>
          {goal.estimatedCost ? <span>{formatMoney(goal.estimatedCost)}</span> : null}
        </div>
      </Card>
    </Link>
  );
}

/** Bandeau récapitulatif au-dessus de la frise. */
export function TimelineSummary({
  currentAge,
  deadlineAge,
  completed,
  total,
}: {
  currentAge: number | null;
  deadlineAge: number | null;
  completed: number;
  total: number;
}) {
  return (
    <Card variant="glass" className="mb-7 flex flex-wrap items-center gap-6 p-5">
      <div className="flex items-center gap-2.5">
        <Sparkles className="size-5 text-blush-500" />
        <div>
          <p className="font-display text-xl">
            {completed} / {total}
          </p>
          <p className="text-xs text-muted-foreground">objectifs réalisés</p>
        </div>
      </div>

      {currentAge != null && deadlineAge != null && (
        <>
          <div className="hidden h-10 w-px bg-border sm:block" />
          <div>
            <p className="font-display text-xl">
              {currentAge} → {deadlineAge} ans
            </p>
            <p className="text-xs text-muted-foreground">
              il te reste {Math.max(0, deadlineAge - currentAge)} an
              {deadlineAge - currentAge > 1 ? "s" : ""}
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
