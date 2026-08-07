"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { CalendarClock, Clock, GripVertical, Plus, Trash2 } from "lucide-react";
import type { Priority } from "@prisma/client";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Hint } from "@/components/ui/tooltip";
import { celebrateStep } from "@/lib/confetti";
import { cn, formatDate, relativeTime } from "@/lib/utils";
import { PRIORITY_CONFIG } from "@/lib/constants";
import { createStep, deleteStep, reorderSteps, toggleStep } from "@/server/actions/steps";
import { BadgeCelebration, type UnlockedBadge } from "@/components/gamification/badge-celebration";

export interface StepNode {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  dueDate: Date | null;
  estimatedMinutes: number | null;
  priority: Priority;
  order: number;
  parentId: string | null;
  children: StepNode[];
}

/**
 * Arbre d'étapes : cases à cocher, sous-étapes et glisser-déposer.
 *
 * Les bascules sont **optimistes** : cocher une case doit être instantané.
 * Le serveur reste la source de vérité et `router.refresh()` réaligne la
 * progression une fois la mutation confirmée.
 */
export function StepList({ goalId, steps }: { goalId: string; steps: StepNode[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(steps);
  const [adding, setAdding] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [celebration, setCelebration] = React.useState<UnlockedBadge[]>([]);

  // Resynchronisation depuis le serveur après `router.refresh()`.
  // On l'ajuste pendant le rendu plutôt que dans un effet : React re-rend
  // immédiatement avec la bonne valeur, sans passe d'affichage intermédiaire.
  const [syncedSteps, setSyncedSteps] = React.useState(steps);
  if (syncedSteps !== steps) {
    setSyncedSteps(steps);
    setItems(steps);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleToggle = async (step: StepNode, event?: React.MouseEvent) => {
    const nextDone = !step.done;

    // Mise à jour optimiste, parent et enfants inclus.
    setItems((prev) =>
      prev.map((s) =>
        s.id === step.id
          ? { ...s, done: nextDone, children: s.children.map((c) => ({ ...c, done: nextDone })) }
          : { ...s, children: s.children.map((c) => (c.id === step.id ? { ...c, done: nextDone } : c)) },
      ),
    );

    if (nextDone) {
      const rect = (event?.target as HTMLElement | undefined)?.getBoundingClientRect();
      celebrateStep(
        rect
          ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight }
          : undefined,
      );
    }

    const result = await toggleStep(step.id);
    if (!result.ok) {
      toast.error("Impossible de mettre à jour l'étape");
      setItems(steps);
      return;
    }
    if (result.badges?.length) setCelebration(result.badges as UnlockedBadge[]);
    router.refresh();
  };

  const handleDragEnd = async (event: DragEndEvent, parentId: string | null, list: StepNode[]) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = list.findIndex((s) => s.id === active.id);
    const newIndex = list.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(list, oldIndex, newIndex);

    if (parentId === null) setItems(reordered);
    else {
      setItems((prev) => prev.map((s) => (s.id === parentId ? { ...s, children: reordered } : s)));
    }

    await reorderSteps(goalId, parentId, reordered.map((s) => s.id));
    router.refresh();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const result = await createStep({ goalId, title: newTitle.trim() });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setNewTitle("");
    router.refresh();
  };

  const total = items.reduce((n, s) => n + (s.children.length || 1), 0);
  const done = items.reduce(
    (n, s) => n + (s.children.length ? s.children.filter((c) => c.done).length : s.done ? 1 : 0),
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{done}</span> / {total} étapes terminées
        </p>
        {!adding && (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus /> Ajouter une étape
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={(e) => handleDragEnd(e, null, items)}
      >
        <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1.5">
            {items.map((step) => (
              <SortableStep
                key={step.id}
                step={step}
                goalId={goalId}
                onToggle={handleToggle}
                onDragEndChildren={handleDragEnd}
                sensors={sensors}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {adding && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Que faut-il faire ensuite ?"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setAdding(false);
                setNewTitle("");
              }
            }}
          />
          <Button type="submit" size="sm">
            Ajouter
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
            Annuler
          </Button>
        </form>
      )}

      {items.length === 0 && !adding && (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Aucune étape pour l&apos;instant. Découpe cet objectif — ou demande à l&apos;assistant de le faire.
        </p>
      )}

      <BadgeCelebration badges={celebration} onDone={() => setCelebration([])} />
    </div>
  );
}

// ─── Une étape (triable) ─────────────────────────────────────────────────────

function SortableStep({
  step,
  goalId,
  onToggle,
  onDragEndChildren,
  sensors,
}: {
  step: StepNode;
  goalId: string;
  onToggle: (step: StepNode, event?: React.MouseEvent) => void;
  onDragEndChildren: (event: DragEndEvent, parentId: string | null, list: StepNode[]) => void;
  sensors: ReturnType<typeof useSensors>;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const [addingChild, setAddingChild] = React.useState(false);
  const [childTitle, setChildTitle] = React.useState("");

  const overdue = step.dueDate && !step.done && new Date(step.dueDate) < new Date();

  const addChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childTitle.trim()) return;
    await createStep({ goalId, parentId: step.id, title: childTitle.trim() });
    setChildTitle("");
    setAddingChild(false);
    router.refresh();
  };

  const remove = async () => {
    await deleteStep(step.id);
    router.refresh();
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("rounded-2xl border border-border/70 bg-card/70", isDragging && "z-10 shadow-lifted")}
    >
      <div className="group flex items-start gap-2.5 p-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Réordonner"
          className="mt-0.5 cursor-grab touch-none text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>

        <Checkbox
          checked={step.done}
          onClick={(e) => onToggle(step, e)}
          className="mt-0.5"
          aria-label={`Marquer « ${step.title} » comme ${step.done ? "non terminée" : "terminée"}`}
        />

        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium leading-snug", step.done && "text-muted-foreground line-through")}>
            {step.title}
          </p>
          {step.description && <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-muted-foreground">
            {step.dueDate && (
              <span className={cn("flex items-center gap-1", overdue && "font-semibold text-destructive")}>
                <CalendarClock className="size-3" />
                {formatDate(step.dueDate)} · {relativeTime(step.dueDate)}
              </span>
            )}
            {step.estimatedMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {step.estimatedMinutes} min
              </span>
            )}
            {step.priority !== "MEDIUM" && (
              <Badge variant={PRIORITY_CONFIG[step.priority].color} className="px-1.5 py-0 text-[0.65rem]">
                {PRIORITY_CONFIG[step.priority].label}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Hint label="Ajouter une sous-étape">
            <Button variant="ghost" size="icon-sm" onClick={() => setAddingChild(true)}>
              <Plus />
            </Button>
          </Hint>
          <Hint label="Supprimer">
            <Button variant="ghost" size="icon-sm" onClick={remove}>
              <Trash2 className="text-destructive" />
            </Button>
          </Hint>
        </div>
      </div>

      {/* Sous-étapes */}
      {(step.children.length > 0 || addingChild) && (
        <div className="ml-9 border-l-2 border-border/60 pl-3 pr-3 pb-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={(e) => onDragEndChildren(e, step.id, step.children)}
          >
            <SortableContext items={step.children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1">
                {step.children.map((child) => (
                  <SubStep key={child.id} step={child} onToggle={onToggle} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          {addingChild && (
            <form onSubmit={addChild} className="mt-2 flex gap-2">
              <Input
                autoFocus
                value={childTitle}
                onChange={(e) => setChildTitle(e.target.value)}
                placeholder="Sous-étape…"
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === "Escape" && setAddingChild(false)}
              />
              <Button type="submit" size="sm">
                Ajouter
              </Button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}

function SubStep({ step, onToggle }: { step: StepNode; onToggle: (s: StepNode, e?: React.MouseEvent) => void }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="group flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-muted/60"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Réordonner"
        className="cursor-grab touch-none text-muted-foreground/30 opacity-0 group-hover:opacity-100"
      >
        <GripVertical className="size-3.5" />
      </button>
      <Checkbox
        checked={step.done}
        onClick={(e) => onToggle(step, e)}
        className="size-4"
        aria-label={step.title}
      />
      <span className={cn("flex-1 text-sm", step.done && "text-muted-foreground line-through")}>{step.title}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        className="opacity-0 group-hover:opacity-100"
        onClick={async () => {
          await deleteStep(step.id);
          router.refresh();
        }}
        aria-label="Supprimer la sous-étape"
      >
        <Trash2 className="text-destructive" />
      </Button>
    </li>
  );
}
