"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import type { GoalStatus } from "@prisma/client";
import { CalendarDays, Coins } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KANBAN_COLUMNS, STATUS_CONFIG, colorClasses } from "@/lib/constants";
import { cn, formatMoney, relativeTime } from "@/lib/utils";
import { celebrateGoal, celebrateFinal } from "@/lib/confetti";
import { setGoalStatus } from "@/server/actions/goals";
import { BadgeCelebration, type UnlockedBadge } from "@/components/gamification/badge-celebration";
import type { GoalListItem } from "@/server/queries/goals";

/**
 * Tableau Kanban en glisser-déposer.
 *
 * Le déplacement est optimiste : la carte change de colonne immédiatement, la
 * mutation part en arrière-plan, et l'état est restauré si elle échoue.
 */
export function KanbanBoard({ goals }: { goals: GoalListItem[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(goals);
  const [dragging, setDragging] = React.useState<GoalListItem | null>(null);
  const [celebration, setCelebration] = React.useState<UnlockedBadge[]>([]);

  // Resynchronisation après `router.refresh()`, ajustée pendant le rendu
  // (cf. « You Might Not Need an Effect ») plutôt que dans un effet.
  const [syncedGoals, setSyncedGoals] = React.useState(goals);
  if (syncedGoals !== goals) {
    setSyncedGoals(goals);
    setItems(goals);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const byStatus = React.useMemo(() => {
    const map = new Map<GoalStatus, GoalListItem[]>();
    for (const status of KANBAN_COLUMNS) map.set(status, []);
    for (const goal of items) {
      if (goal.status === "ARCHIVED") continue;
      map.get(goal.status)?.push(goal);
    }
    return map;
  }, [items]);

  const onDragStart = (event: DragStartEvent) => {
    setDragging(items.find((g) => g.id === event.active.id) ?? null);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setDragging(null);
    const { active, over } = event;
    if (!over) return;

    // La zone de dépôt est soit une colonne, soit une carte : dans le second
    // cas on récupère le statut de la carte survolée.
    const overId = String(over.id);
    const target = (KANBAN_COLUMNS.includes(overId as GoalStatus)
      ? overId
      : items.find((g) => g.id === overId)?.status) as GoalStatus | undefined;

    const goal = items.find((g) => g.id === active.id);
    if (!target || !goal || goal.status === target) return;

    const previous = items;
    setItems((prev) => prev.map((g) => (g.id === goal.id ? { ...g, status: target } : g)));

    const result = await setGoalStatus(goal.id, target);
    if (!result.ok) {
      toast.error("Déplacement impossible");
      setItems(previous);
      return;
    }

    if (result.justCompleted) {
      if (result.isFinal) celebrateFinal();
      else celebrateGoal();
      toast.success(`« ${goal.title} » terminé 🎉`);
      if (result.badges?.length) setCelebration(result.badges as UnlockedBadge[]);
    }
    router.refresh();
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((status) => (
            <Column key={status} status={status} goals={byStatus.get(status) ?? []} />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200 }}>
          {dragging && <KanbanCard goal={dragging} overlay />}
        </DragOverlay>
      </DndContext>

      <BadgeCelebration badges={celebration} onDone={() => setCelebration([])} />
    </>
  );
}

function Column({ status, goals }: { status: GoalStatus; goals: GoalListItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = STATUS_CONFIG[status];
  const colors = colorClasses(config.color);

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-[19rem] shrink-0 flex-col rounded-3xl border border-border/60 bg-muted/30 p-3 transition-colors",
        isOver && "border-blush-300 bg-blush-50/60 dark:bg-blush-900/20",
      )}
      aria-label={config.label}
    >
      <header className="mb-3 flex items-center gap-2 px-1">
        <span className={cn("size-2.5 rounded-full", colors.dot)} />
        <h2 className="font-display text-sm">{config.label}</h2>
        <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs font-bold tabular-nums">
          {goals.length}
        </span>
      </header>

      <SortableContext items={goals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2.5">
          {goals.map((goal) => (
            <SortableCard key={goal.id} goal={goal} />
          ))}

          {goals.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
              {config.description}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableCard({ goal }: { goal: GoalListItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: goal.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <KanbanCard goal={goal} />
    </div>
  );
}

function KanbanCard({ goal, overlay }: { goal: GoalListItem; overlay?: boolean }) {
  const colors = colorClasses(goal.color);

  return (
    <Card
      className={cn(
        "cursor-grab overflow-hidden p-3 active:cursor-grabbing",
        overlay && "rotate-2 shadow-lifted",
        goal.isFinal && "border-gradient",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl text-base", colors.softBg)}>
          {goal.emoji ?? "🎯"}
        </span>
        <div className="min-w-0 flex-1">
          {/* Le lien est neutralisé pendant le glisser-déposer par dnd-kit */}
          <Link
            href={`/objectifs/${goal.slug}`}
            className="line-clamp-2 text-sm font-medium leading-snug hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {goal.title}
          </Link>
          {goal.category && (
            <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
              {goal.category.emoji} {goal.category.name}
            </p>
          )}
        </div>
      </div>

      <Progress value={goal.progress} color={goal.color} size="sm" className="mt-3" />

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-muted-foreground">
        <span className="font-bold tabular-nums text-foreground">{goal.progress} %</span>
        {goal.targetDate && (
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3" />
            {relativeTime(goal.targetDate)}
          </span>
        )}
        {goal.estimatedCost ? (
          <span className="flex items-center gap-1">
            <Coins className="size-3" />
            {formatMoney(goal.estimatedCost)}
          </span>
        ) : null}
        {goal._count.steps > 0 && <Badge variant="muted">{goal._count.steps} étapes</Badge>}
      </div>
    </Card>
  );
}
