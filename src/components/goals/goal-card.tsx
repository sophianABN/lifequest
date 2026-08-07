"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CalendarDays, Coins, Lock, MapPin, Star, TrendingUp } from "lucide-react";
import type { Readiness } from "@prisma/client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Hint } from "@/components/ui/tooltip";
import { Sparkle } from "@/components/shared/decorations";
import { colorClasses, READINESS_CONFIG, STATUS_CONFIG } from "@/lib/constants";
import { cn, formatMoney, relativeTime } from "@/lib/utils";
import type { GoalListItem } from "@/server/queries/goals";

/**
 * Carte d'objectif — la brique visuelle la plus réutilisée de l'application
 * (tableau de bord, liste, recherche, Kanban en variante compacte).
 */
export function GoalCard({
  goal,
  readiness,
  score,
  index = 0,
  compact = false,
}: {
  goal: GoalListItem;
  readiness?: Readiness;
  score?: number;
  index?: number;
  compact?: boolean;
}) {
  const colors = colorClasses(goal.color);
  const status = STATUS_CONFIG[goal.status];
  const done = goal.status === "DONE";
  const funded = goal.estimatedCost ? Math.min(100, Math.round((goal.savedAmount / goal.estimatedCost) * 100)) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/objectifs/${goal.slug}`} className="group block h-full">
        <Card
          interactive
          className={cn(
            "relative flex h-full flex-col overflow-hidden",
            goal.isFinal && "border-gradient shadow-glow-gold",
          )}
        >
          {/* Bandeau de couleur */}
          <div className={cn("h-1.5 w-full bg-gradient-to-r", colors.gradient)} />

          {goal.isFinal && (
            <span className="absolute right-3 top-4 flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-gold-700 dark:bg-gold-900/60 dark:text-gold-200">
              <Sparkle size={10} /> Objectif final
            </span>
          )}

          <div className="flex flex-1 flex-col p-4">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-2xl text-xl transition-transform group-hover:scale-110",
                  colors.softBg,
                )}
              >
                {goal.emoji ?? "🎯"}
              </span>

              <div className="min-w-0 flex-1">
                <h3
                  className={cn(
                    "font-display text-base leading-snug",
                    // Le badge « objectif final » est positionné en absolu :
                    // on réserve la place pour éviter le chevauchement.
                    goal.isFinal && "pr-28",
                    done && "text-muted-foreground line-through decoration-aqua-400 decoration-2",
                  )}
                >
                  {goal.title}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {goal.category && (
                    <span className="text-[0.7rem] text-muted-foreground">
                      {goal.category.emoji} {goal.category.name}
                    </span>
                  )}
                  {goal.isFavorit && <Star className="size-3 fill-gold-400 text-gold-400" />}
                </div>
              </div>
            </div>

            {!compact && goal.description && (
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>
            )}

            {/* Progression */}
            <div className="mt-4">
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="font-semibold text-muted-foreground">{status.label}</span>
                <span className="font-bold tabular-nums">{goal.progress} %</span>
              </div>
              <Progress value={goal.progress} color={goal.color} size="sm" />
            </div>

            {/* Métadonnées */}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.7rem] text-muted-foreground">
              {goal.targetDate && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3" />
                  {relativeTime(goal.targetDate)}
                </span>
              )}
              {goal.country && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {goal.country}
                </span>
              )}
              {goal.estimatedCost != null && goal.estimatedCost > 0 && (
                <Hint label={`${formatMoney(goal.savedAmount)} épargnés sur ${formatMoney(goal.estimatedCost)}`}>
                  <span className="flex items-center gap-1">
                    <Coins className="size-3" />
                    {funded} % financé
                  </span>
                </Hint>
              )}
              {score != null && score > 0 && (
                <Hint label="Score de priorité calculé par le moteur d'intelligence">
                  <span className="flex items-center gap-1 font-semibold text-blush-600 dark:text-blush-300">
                    <TrendingUp className="size-3" />
                    {score}
                  </span>
                </Hint>
              )}
            </div>

            {readiness && readiness !== "READY" && (
              <Badge variant={READINESS_CONFIG[readiness].color} className="mt-3 self-start">
                {readiness === "LOCKED" && <Lock />}
                {READINESS_CONFIG[readiness].label}
              </Badge>
            )}
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
