"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { CalendarEventKind } from "@prisma/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDate, isSameDay, startOfDay, toDateInput } from "@/lib/utils";
import { colorClasses } from "@/lib/constants";
import { createEvent, deleteEvent, moveEvent, toggleEventDone } from "@/server/actions/calendar";

export interface CalendarItem {
  id: string;
  title: string;
  notes: string | null;
  start: Date;
  end: Date | null;
  allDay: boolean;
  kind: CalendarEventKind;
  color: string | null;
  done: boolean;
  goalSlug: string | null;
  goalTitle: string | null;
}

type ViewMode = "day" | "week" | "month" | "year";

const KIND_LABEL: Record<CalendarEventKind, string> = {
  TASK: "Étape",
  MILESTONE: "Jalon",
  REMINDER: "Rappel",
  EVENT: "Événement",
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/** Lundi de la semaine contenant `date`. */
function startOfWeek(date: Date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Grille de 6 × 7 jours couvrant le mois, semaines complètes. */
function monthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/**
 * Calendrier complet — quatre vues, glisser-déposer, création rapide.
 *
 * Les événements sont chargés une fois pour la période affichée et filtrés en
 * mémoire : changer de vue ou de semaine ne provoque pas de nouvel aller-retour.
 */
export function CalendarView({
  items,
  goals,
}: {
  items: CalendarItem[];
  goals: { id: string; title: string; emoji: string | null; color: string }[];
}) {
  const router = useRouter();
  const [view, setView] = React.useState<ViewMode>("month");
  const [cursor, setCursor] = React.useState(() => new Date());
  const [events, setEvents] = React.useState(items);
  const [selected, setSelected] = React.useState<CalendarItem | null>(null);
  const [creatingOn, setCreatingOn] = React.useState<Date | null>(null);

  // Resynchronisation après `router.refresh()`, ajustée pendant le rendu.
  const [syncedItems, setSyncedItems] = React.useState(items);
  if (syncedItems !== items) {
    setSyncedItems(items);
    setEvents(items);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const eventsOn = React.useCallback(
    (day: Date) => events.filter((e) => isSameDay(new Date(e.start), day)),
    [events],
  );

  const shift = (amount: number) => {
    const d = new Date(cursor);
    if (view === "day") d.setDate(d.getDate() + amount);
    else if (view === "week") d.setDate(d.getDate() + amount * 7);
    else if (view === "month") d.setMonth(d.getMonth() + amount);
    else d.setFullYear(d.getFullYear() + amount);
    setCursor(d);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const eventId = String(active.id);
    const targetDay = new Date(String(over.id));
    const item = events.find((e) => e.id === eventId);
    if (!item || isSameDay(new Date(item.start), targetDay)) return;

    // On conserve l'heure d'origine, seule la date change.
    const original = new Date(item.start);
    const next = new Date(targetDay);
    next.setHours(original.getHours(), original.getMinutes(), 0, 0);

    const previous = events;
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, start: next } : e)));

    const result = await moveEvent(eventId, next.toISOString());
    if (!result.ok) {
      toast.error("Déplacement impossible");
      setEvents(previous);
      return;
    }
    router.refresh();
  };

  const title =
    view === "year"
      ? String(cursor.getFullYear())
      : view === "month"
        ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
        : view === "week"
          ? `Semaine du ${formatDate(startOfWeek(cursor))}`
          : formatDate(cursor, "long");

  return (
    <div className="space-y-4">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Précédent">
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Suivant">
            <ChevronRight />
          </Button>
        </div>

        <h2 className="font-display text-xl capitalize">{title}</h2>

        <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
          Aujourd&apos;hui
        </Button>

        {/* Sur téléphone ce groupe prend toute la largeur et passe sous le
            titre : les quatre onglets plus « Ajouter » ne tiennent pas sur une
            ligne de 375 px, et sans `w-full` le groupe reste un seul élément
            flex insécable qui pousse la page. */}
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as ViewMode)}
            className="min-w-0 flex-1 sm:flex-none"
          >
            {/* `flex-1` et un rembourrage réduit sous `sm` : à 320 px, quatre
                onglets en `px-4` dépassent de deux pixels. */}
            <TabsList className="flex w-full sm:inline-flex sm:w-auto">
              {(
                [
                  ["day", "Jour"],
                  ["week", "Semaine"],
                  ["month", "Mois"],
                  ["year", "Année"],
                ] as const
              ).map(([valeur, libelle]) => (
                <TabsTrigger
                  key={valeur}
                  value={valeur}
                  className="flex-1 justify-center px-2 sm:flex-none sm:px-4"
                >
                  {libelle}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Button size="sm" className="shrink-0" onClick={() => setCreatingOn(new Date())}>
            <CalendarPlus />
            <span className="max-sm:sr-only">Ajouter</span>
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {view === "month" && (
          <MonthView cursor={cursor} eventsOn={eventsOn} onSelect={setSelected} onCreate={setCreatingOn} />
        )}
        {view === "week" && (
          <WeekView cursor={cursor} eventsOn={eventsOn} onSelect={setSelected} onCreate={setCreatingOn} />
        )}
        {view === "day" && <DayView cursor={cursor} events={eventsOn(cursor)} onSelect={setSelected} />}
        {view === "year" && (
          <YearView cursor={cursor} events={events} onPick={(d) => { setCursor(d); setView("month"); }} />
        )}
      </DndContext>

      <EventDialog
        event={selected}
        onClose={() => setSelected(null)}
        onChanged={() => {
          setSelected(null);
          router.refresh();
        }}
      />

      <CreateDialog
        key={creatingOn?.toISOString() ?? "none"}
        day={creatingOn}
        goals={goals}
        onClose={() => setCreatingOn(null)}
        onCreated={() => {
          setCreatingOn(null);
          router.refresh();
        }}
      />
    </div>
  );
}

// ─── Vue mois ────────────────────────────────────────────────────────────────

function MonthView({
  cursor,
  eventsOn,
  onSelect,
  onCreate,
}: {
  cursor: Date;
  eventsOn: (d: Date) => CalendarItem[];
  onSelect: (e: CalendarItem) => void;
  onCreate: (d: Date) => void;
}) {
  const days = monthGrid(cursor);
  const today = new Date();

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            events={eventsOn(day)}
            outside={day.getMonth() !== cursor.getMonth()}
            isToday={isSameDay(day, today)}
            onSelect={onSelect}
            onCreate={onCreate}
          />
        ))}
      </div>
    </Card>
  );
}

function DayCell({
  day,
  events,
  outside,
  isToday,
  onSelect,
  onCreate,
  tall,
}: {
  day: Date;
  events: CalendarItem[];
  outside?: boolean;
  isToday: boolean;
  onSelect: (e: CalendarItem) => void;
  onCreate: (d: Date) => void;
  tall?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day.toISOString() });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative border-b border-r border-border/60 p-1.5 transition-colors",
        tall ? "min-h-40" : "min-h-24",
        outside && "bg-muted/20",
        isOver && "bg-blush-50 dark:bg-blush-900/20",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums",
            isToday && "bg-blush-400 text-white",
            outside && "text-muted-foreground/50",
          )}
        >
          {day.getDate()}
        </span>
        <button
          type="button"
          onClick={() => onCreate(day)}
          aria-label={`Ajouter un événement le ${formatDate(day)}`}
          className="opacity-0 transition-opacity hover:text-blush-500 group-hover:opacity-100"
        >
          <CalendarPlus className="size-3.5" />
        </button>
      </div>

      <div className="mt-1 space-y-1">
        {events.slice(0, tall ? 8 : 3).map((event) => (
          <DraggableEvent key={event.id} event={event} onSelect={onSelect} />
        ))}
        {events.length > (tall ? 8 : 3) && (
          <p className="px-1 text-[0.65rem] text-muted-foreground">
            +{events.length - (tall ? 8 : 3)} autre(s)
          </p>
        )}
      </div>
    </div>
  );
}

function DraggableEvent({
  event,
  onSelect,
}: {
  event: CalendarItem;
  onSelect: (e: CalendarItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: event.id });
  const colors = colorClasses(event.color ?? "lilac");

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={() => onSelect(event)}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        "flex w-full items-center gap-1.5 truncate rounded-lg px-1.5 py-1 text-left text-[0.7rem] transition-colors",
        colors.softBg,
        colors.text,
        event.done && "line-through opacity-50",
        isDragging && "z-20 opacity-80 shadow-lifted",
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", colors.dot)} />
      <span className="truncate">{event.title}</span>
    </button>
  );
}

// ─── Vue semaine ─────────────────────────────────────────────────────────────

function WeekView({
  cursor,
  eventsOn,
  onSelect,
  onCreate,
}: {
  cursor: Date;
  eventsOn: (d: Date) => CalendarItem[];
  onSelect: (e: CalendarItem) => void;
  onCreate: (d: Date) => void;
}) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const today = new Date();

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {days.map((d, i) => (
          <div key={d.toISOString()} className="py-2 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {WEEKDAYS[i]}
            </p>
            <p className={cn("text-sm font-semibold", isSameDay(d, today) && "text-blush-600 dark:text-blush-300")}>
              {d.getDate()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            events={eventsOn(day)}
            isToday={isSameDay(day, today)}
            onSelect={onSelect}
            onCreate={onCreate}
            tall
          />
        ))}
      </div>
    </Card>
  );
}

// ─── Vue jour ────────────────────────────────────────────────────────────────

function DayView({
  cursor,
  events,
  onSelect,
}: {
  cursor: Date;
  events: CalendarItem[];
  onSelect: (e: CalendarItem) => void;
}) {
  const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
    <Card className="p-5">
      <h3 className="font-display text-lg capitalize">{formatDate(cursor, "long")}</h3>

      {sorted.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Rien de prévu ce jour-là. Profites-en, ou planifie une étape.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {sorted.map((event) => {
            const colors = colorClasses(event.color ?? "lilac");
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelect(event)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border/60 p-3 text-left transition-colors hover:bg-muted"
                >
                  <span className={cn("h-10 w-1.5 shrink-0 rounded-full", colors.bg)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-medium", event.done && "text-muted-foreground line-through")}>
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.allDay
                        ? "Toute la journée"
                        : new Date(event.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {event.goalTitle && ` · ${event.goalTitle}`}
                    </p>
                  </div>
                  <Badge variant="muted">{KIND_LABEL[event.kind]}</Badge>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ─── Vue année ───────────────────────────────────────────────────────────────

function YearView({
  cursor,
  events,
  onPick,
}: {
  cursor: Date;
  events: CalendarItem[];
  onPick: (d: Date) => void;
}) {
  const year = cursor.getFullYear();
  const today = new Date();

  // Densité d'événements par jour, pour colorer la mini-grille.
  const counts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const d = new Date(e.start);
      if (d.getFullYear() !== year) continue;
      const key = toDateInput(d);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events, year]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {MONTHS.map((month, monthIndex) => {
        const first = new Date(year, monthIndex, 1);
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const offset = (first.getDay() + 6) % 7;

        return (
          <Card key={month} className="p-3.5">
            <button
              type="button"
              onClick={() => onPick(new Date(year, monthIndex, 1))}
              className="mb-2 font-display text-sm hover:text-blush-600 dark:hover:text-blush-300"
            >
              {month}
            </button>

            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((d) => (
                <span key={d} className="text-[0.6rem] text-muted-foreground">
                  {d[0]}
                </span>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span key={`pad-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = new Date(year, monthIndex, i + 1);
                const count = counts.get(toDateInput(day)) ?? 0;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onPick(day)}
                    title={count > 0 ? `${count} événement(s)` : undefined}
                    className={cn(
                      "grid aspect-square place-items-center rounded text-[0.65rem] tabular-nums transition-colors hover:bg-muted",
                      count > 0 && "bg-blush-200 font-bold text-blush-800 dark:bg-blush-900/60 dark:text-blush-100",
                      count > 2 && "bg-blush-400 text-white dark:bg-blush-600",
                      isSameDay(day, today) && "ring-2 ring-blush-400",
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Boîtes de dialogue ──────────────────────────────────────────────────────

function EventDialog({
  event,
  onClose,
  onChanged,
}: {
  event: CalendarItem | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  if (!event) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            {formatDate(event.start, "long")}
            {!event.allDay &&
              ` à ${new Date(event.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
          <Badge variant="muted">{KIND_LABEL[event.kind]}</Badge>
          {event.notes && <p className="whitespace-pre-wrap">{event.notes}</p>}
          {event.goalSlug && (
            <Link
              href={`/objectifs/${event.goalSlug}`}
              className="inline-block font-semibold text-blush-600 hover:underline dark:text-blush-300"
            >
              Voir l&apos;objectif : {event.goalTitle}
            </Link>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              await deleteEvent(event.id);
              onChanged();
            }}
          >
            <Trash2 /> Supprimer
          </Button>
          <Button
            size="sm"
            variant={event.done ? "outline" : "primary"}
            onClick={async () => {
              await toggleEventDone(event.id);
              onChanged();
            }}
          >
            <Check /> {event.done ? "Rouvrir" : "Marquer comme fait"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateDialog({
  day,
  goals,
  onClose,
  onCreated,
}: {
  day: Date | null;
  goals: { id: string; title: string; emoji: string | null; color: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [kind, setKind] = React.useState<CalendarEventKind>("EVENT");
  const [goalId, setGoalId] = React.useState<string>("none");
  const [pending, setPending] = React.useState(false);

  // Pas d'effet de réinitialisation : le parent remonte ce composant via une
  // `key` dérivée du jour, donc l'état repart naturellement de zéro.
  if (!day) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setPending(true);

    const goal = goals.find((g) => g.id === goalId);
    const result = await createEvent({
      title: title.trim(),
      notes: notes.trim() || null,
      start: day.toISOString(),
      allDay: true,
      kind,
      goalId: goalId === "none" ? null : goalId,
      color: goal?.color ?? null,
    });

    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Ajouté au calendrier");
    onCreated();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvel événement — {formatDate(day, "long")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Titre</Label>
            <Input
              id="event-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entraînement, rendez-vous, rappel…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as CalendarEventKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KIND_LABEL).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Objectif lié</Label>
              <Select value={goalId} onValueChange={setGoalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {goals.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.emoji} {g.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-notes">Notes</Label>
            <Textarea id="event-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" loading={pending}>
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
