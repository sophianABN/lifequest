"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import type { Category, GoalStatus, Person, Readiness } from "@prisma/client";
import { LayoutGrid, List, Plus, Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatMoney, relativeTime } from "@/lib/utils";
import { PRIORITY_CONFIG, READINESS_CONFIG, STATUS_CONFIG, colorClasses } from "@/lib/constants";
import type { GoalListItem } from "@/server/queries/goals";
import { GoalCard } from "./goal-card";
import { GoalFormDialog } from "./goal-form";
import Link from "next/link";

type SortKey = "smart" | "date" | "progress" | "cost" | "alpha";

export interface ExplorerGoal {
  goal: GoalListItem;
  score: number;
  readiness: Readiness;
}

/**
 * Explorateur d'objectifs : recherche instantanée, filtres combinables et
 * deux densités d'affichage. Tout le filtrage est fait côté client — 25 à 100
 * objectifs tiennent largement en mémoire, et la réactivité immédiate compte
 * plus ici qu'une pagination serveur.
 */
export function GoalsExplorer({
  items,
  categories,
  people,
}: {
  items: ExplorerGoal[];
  categories: Category[];
  people: Person[];
}) {
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = React.useState(searchParams.get("nouveau") === "1");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");
  const [status, setStatus] = React.useState<string>("all");
  const [priority, setPriority] = React.useState<string>("all");
  const [readiness, setReadiness] = React.useState<string>("all");
  const [country, setCountry] = React.useState<string>("all");
  const [sort, setSort] = React.useState<SortKey>("smart");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = React.useState(false);

  const countries = React.useMemo(
    () => [...new Set(items.map((i) => i.goal.country).filter((c): c is string => Boolean(c)))].sort(),
    [items],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    const result = items.filter(({ goal, readiness: r }) => {
      if (q) {
        const haystack = `${goal.title} ${goal.description ?? ""} ${goal.country ?? ""} ${goal.category?.name ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (category !== "all" && goal.category?.id !== category) return false;
      if (status !== "all" && goal.status !== status) return false;
      if (priority !== "all" && goal.priority !== priority) return false;
      if (readiness !== "all" && r !== readiness) return false;
      if (country !== "all" && goal.country !== country) return false;
      return true;
    });

    const sorters: Record<SortKey, (a: ExplorerGoal, b: ExplorerGoal) => number> = {
      smart: (a, b) => b.score - a.score,
      date: (a, b) => {
        const av = a.goal.targetDate?.getTime() ?? Infinity;
        const bv = b.goal.targetDate?.getTime() ?? Infinity;
        return av - bv;
      },
      progress: (a, b) => b.goal.progress - a.goal.progress,
      cost: (a, b) => (b.goal.estimatedCost ?? 0) - (a.goal.estimatedCost ?? 0),
      alpha: (a, b) => a.goal.title.localeCompare(b.goal.title, "fr"),
    };

    // L'objectif final reste toujours en tête : c'est le fil rouge de la quête.
    return result.sort((a, b) => {
      if (a.goal.isFinal !== b.goal.isFinal) return a.goal.isFinal ? -1 : 1;
      return sorters[sort](a, b);
    });
  }, [items, query, category, status, priority, readiness, country, sort]);

  const activeFilters = [category, status, priority, readiness, country].filter((f) => f !== "all").length;

  const reset = () => {
    setCategory("all");
    setStatus("all");
    setPriority("all");
    setReadiness("all");
    setCountry("all");
    setQuery("");
  };

  return (
    <div className="space-y-5">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un objectif, un pays…"
            className="pl-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Effacer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="smart">Tri intelligent</SelectItem>
            <SelectItem value="date">Par échéance</SelectItem>
            <SelectItem value="progress">Par progression</SelectItem>
            <SelectItem value="cost">Par coût</SelectItem>
            <SelectItem value="alpha">Alphabétique</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showFilters || activeFilters > 0 ? "soft" : "outline"}
          size="icon"
          onClick={() => setShowFilters((s) => !s)}
          aria-label="Filtres"
          className="relative"
        >
          <SlidersHorizontal />
          {activeFilters > 0 && (
            <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-blush-500 text-[0.6rem] font-bold text-white">
              {activeFilters}
            </span>
          )}
        </Button>

        <div className="flex rounded-full border border-border p-0.5">
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-label="Vue grille"
            aria-pressed={view === "grid"}
            className={cn("grid size-8 place-items-center rounded-full transition-colors", view === "grid" && "bg-muted")}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-label="Vue liste"
            aria-pressed={view === "list"}
            className={cn("grid size-8 place-items-center rounded-full transition-colors", view === "list" && "bg-muted")}
          >
            <List className="size-4" />
          </button>
        </div>

        <Button onClick={() => setDialogOpen(true)}>
          <Plus /> Nouvel objectif
        </Button>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="grid gap-3 rounded-2xl border border-border bg-card/60 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <FilterSelect label="Catégorie" value={category} onChange={setCategory}
            options={[{ value: "all", label: "Toutes" }, ...categories.map((c) => ({ value: c.id, label: `${c.emoji ?? ""} ${c.name}` }))]} />
          <FilterSelect label="Statut" value={status} onChange={setStatus}
            options={[{ value: "all", label: "Tous" }, ...Object.entries(STATUS_CONFIG).map(([k, c]) => ({ value: k, label: c.label }))]} />
          <FilterSelect label="Priorité" value={priority} onChange={setPriority}
            options={[{ value: "all", label: "Toutes" }, ...Object.entries(PRIORITY_CONFIG).map(([k, c]) => ({ value: k, label: c.label }))]} />
          <FilterSelect label="Faisabilité" value={readiness} onChange={setReadiness}
            options={[{ value: "all", label: "Toutes" }, ...Object.entries(READINESS_CONFIG).map(([k, c]) => ({ value: k, label: c.label }))]} />
          <FilterSelect label="Pays" value={country} onChange={setCountry}
            options={[{ value: "all", label: "Tous" }, ...countries.map((c) => ({ value: c, label: c }))]} />

          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={reset} className="justify-self-start lg:col-span-5">
              <X /> Réinitialiser les filtres
            </Button>
          )}
        </div>
      )}

      {/* Résumé */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} objectif{filtered.length > 1 ? "s" : ""}
        {activeFilters > 0 || query ? " correspondant à ta recherche" : ""}
      </p>

      {/* Résultats */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun objectif trouvé"
          description="Essaie d'élargir tes filtres, ou crée un nouvel objectif."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus /> Nouvel objectif
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map(({ goal, score, readiness: r }, i) => (
            <GoalCard key={goal.id} goal={goal} index={i} score={score} readiness={r} />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {filtered.map(({ goal, score, readiness: r }) => {
            const colors = colorClasses(goal.color);
            return (
              <li key={goal.id}>
                <Link
                  href={`/objectifs/${goal.slug}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/60"
                >
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-lg", colors.softBg)}>
                    {goal.emoji ?? "🎯"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate font-medium", goal.status === "DONE" && "text-muted-foreground line-through")}>
                      {goal.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{STATUS_CONFIG[goal.status as GoalStatus].label}</span>
                      {goal.targetDate && <span>{relativeTime(goal.targetDate)}</span>}
                      {goal.estimatedCost ? <span>{formatMoney(goal.estimatedCost)}</span> : null}
                      {goal.country && <span>{goal.country}</span>}
                    </div>
                  </div>

                  <div className="hidden w-40 shrink-0 sm:block">
                    <Progress value={goal.progress} color={goal.color} size="sm" />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums">{goal.progress} %</span>

                  {r !== "READY" && (
                    <Badge variant={READINESS_CONFIG[r].color} className="hidden shrink-0 lg:inline-flex">
                      {READINESS_CONFIG[r].label}
                    </Badge>
                  )}
                  <span className="hidden w-8 shrink-0 text-right text-xs font-semibold text-blush-600 xl:block dark:text-blush-300">
                    {score}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <GoalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        people={people}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
