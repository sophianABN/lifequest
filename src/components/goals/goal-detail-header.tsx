"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, MoreVertical, Pencil, Star, Trash2 } from "lucide-react";
import type { Category, GoalStatus, Person } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GlowBlob, Sparkle, StarField } from "@/components/shared/decorations";
import { BadgeCelebration, type UnlockedBadge } from "@/components/gamification/badge-celebration";
import { GoalFormDialog, type GoalFormValues } from "./goal-form";
import { celebrateFinal, celebrateGoal } from "@/lib/confetti";
import { cn, formatDate, relativeTime } from "@/lib/utils";
import { DIFFICULTY_LABELS, PRIORITY_CONFIG, STATUS_CONFIG, colorClasses } from "@/lib/constants";
import { deleteGoal, setGoalStatus, toggleFavorite } from "@/server/actions/goals";

/**
 * En-tête de la fiche objectif : identité, progression, statut et actions.
 * L'objectif final reçoit un traitement holographique distinct — il doit se
 * détacher visuellement de tous les autres.
 */
export function GoalDetailHeader({
  goal,
  categories,
  people,
  formValues,
}: {
  goal: {
    id: string;
    slug: string;
    title: string;
    emoji: string | null;
    description: string | null;
    motivation: string | null;
    color: string;
    status: GoalStatus;
    priority: keyof typeof PRIORITY_CONFIG;
    difficulty: number;
    progress: number;
    targetDate: Date | null;
    completedAt: Date | null;
    country: string | null;
    city: string | null;
    isFinal: boolean;
    isFavorit: boolean;
    category: Category | null;
  };
  categories: Category[];
  people: Person[];
  formValues: GoalFormValues;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [favorite, setFavorite] = React.useState(goal.isFavorit);
  const [celebration, setCelebration] = React.useState<UnlockedBadge[]>([]);
  const colors = colorClasses(goal.color);

  const changeStatus = async (status: GoalStatus) => {
    const result = await setGoalStatus(goal.id, status);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.justCompleted) {
      if (result.isFinal) celebrateFinal();
      else celebrateGoal();
      toast.success(
        result.isFinal ? "La quête est accomplie 🎡✨" : `« ${goal.title} » est terminé. Bravo 🎉`,
      );
      if (result.badges?.length) setCelebration(result.badges as UnlockedBadge[]);
    }
    router.refresh();
  };

  const remove = async () => {
    await deleteGoal(goal.id);
    toast.success("Objectif supprimé");
    router.push("/objectifs");
  };

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border p-6 shadow-card sm:p-8",
          goal.isFinal
            ? "border-gold-300/60 shadow-glow-gold"
            : "border-border/60 bg-gradient-to-br from-card to-muted/40",
        )}
      >
        {goal.isFinal ? (
          <>
            <div className="absolute inset-0 bg-holo opacity-30" />
            <StarField count={16} />
          </>
        ) : (
          <GlowBlob className={cn("-right-20 -top-20 size-56", colors.softBg)} />
        )}

        <div className="relative">
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3">
            <Link href="/objectifs">
              <ArrowLeft /> Tous les objectifs
            </Link>
          </Button>

          <div className="flex flex-wrap items-start gap-4">
            <span className={cn("grid size-16 shrink-0 place-items-center rounded-3xl text-3xl", colors.softBg)}>
              {goal.emoji ?? "🎯"}
            </span>

            <div className="min-w-0 flex-1">
              {goal.isFinal && (
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gold-700 dark:text-gold-200">
                  <Sparkle size={12} /> Objectif final de la quête
                </p>
              )}
              <h1 className="mt-1 text-3xl leading-tight sm:text-4xl">{goal.title}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {goal.category && (
                  <Badge variant="muted">
                    {goal.category.emoji} {goal.category.name}
                  </Badge>
                )}
                <Badge variant={PRIORITY_CONFIG[goal.priority].color}>
                  Priorité {PRIORITY_CONFIG[goal.priority].label.toLowerCase()}
                </Badge>
                <Badge variant="outline">{DIFFICULTY_LABELS[goal.difficulty]}</Badge>
                {goal.country && <Badge variant="outline">{[goal.city, goal.country].filter(Boolean).join(", ")}</Badge>}
                {goal.targetDate && (
                  <Badge variant="outline">
                    {formatDate(goal.targetDate, "long")} · {relativeTime(goal.targetDate)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label={favorite ? "Retirer des favoris" : "Mettre en favori"}
                onClick={async () => {
                  setFavorite((f) => !f);
                  await toggleFavorite(goal.id);
                  router.refresh();
                }}
              >
                <Star className={cn(favorite && "fill-gold-400 text-gold-400")} />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Plus d'actions">
                    <MoreVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil /> Modifier
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onClick={() => setDeleteOpen(true)}>
                    <Trash2 /> Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {goal.description && <p className="mt-5 max-w-3xl text-muted-foreground">{goal.description}</p>}

          {goal.motivation && (
            <blockquote className="mt-4 max-w-2xl border-l-4 border-blush-300 pl-4 font-hand text-lg text-ink-700 dark:text-ink-200">
              « {goal.motivation} »
            </blockquote>
          )}

          {/* Progression + statut */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="min-w-52 flex-1">
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Progression</span>
                <span className="font-display text-xl tabular-nums">{goal.progress} %</span>
              </div>
              <Progress value={goal.progress} color={goal.color} size="lg" />
            </div>

            <Select value={goal.status} onValueChange={(v) => changeStatus(v as GoalStatus)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {goal.status !== "DONE" && (
              <Button variant={goal.isFinal ? "gold" : "primary"} onClick={() => changeStatus("DONE")}>
                <CheckCircle2 /> Marquer comme réalisé
              </Button>
            )}
          </div>

          {goal.completedAt && (
            <p className="mt-3 text-sm font-semibold text-aqua-600 dark:text-aqua-300">
              Réalisé le {formatDate(goal.completedAt, "long")} 🎉
            </p>
          )}
        </div>
      </div>

      <GoalFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        categories={categories}
        people={people}
        initial={formValues}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer cet objectif ?</DialogTitle>
            <DialogDescription>
              « {goal.title} », ses étapes, sa checklist et ses documents seront définitivement
              supprimés. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={remove}>
              <Trash2 /> Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BadgeCelebration badges={celebration} onDone={() => setCelebration([])} />
    </>
  );
}
