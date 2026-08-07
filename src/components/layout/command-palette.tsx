"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { BookHeart, CheckCircle2, Circle, Loader2, Plus, Search, Target } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { NAV_ITEMS } from "./nav-config";
import { formatDate } from "@/lib/utils";

interface SearchResults {
  goals: { id: string; slug: string; title: string; emoji: string | null; progress: number }[];
  steps: { id: string; title: string; done: boolean; goal: { slug: string; title: string; emoji: string | null } }[];
  journal: { id: string; date: string; whatIDid: string | null }[];
}

const EMPTY: SearchResults = { goals: [], steps: [], journal: [] };

/**
 * Palette de commandes (⌘K / Ctrl+K).
 * Navigation, recherche globale et création rapide au même endroit — c'est le
 * raccourci qui rend l'application utilisable au clavier de bout en bout.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResults>(EMPTY);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const tooShort = query.trim().length < 2;

  // Recherche débouncée : 220 ms suffit pour ne pas suivre chaque frappe.
  React.useEffect(() => {
    if (tooShort) return;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      // Le témoin de chargement n'apparaît qu'au moment où la requête part
      // vraiment : pendant les 220 ms de debounce, il ne ferait que clignoter.
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (res.ok) setResults(await res.json());
      } catch {
        // Requête annulée par la frappe suivante : rien à signaler.
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, tooShort]);

  // En dessous de deux caractères, on n'affiche rien : c'est une valeur
  // dérivée de la saisie, pas un état à synchroniser.
  const visibleResults = tooShort ? EMPTY : results;

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const hasResults = visibleResults.goals.length + visibleResults.steps.length + visibleResults.journal.length > 0;

  return (
    <>
      {/* Déclencheur visible dans la topbar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-xs items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 text-sm text-muted-foreground transition-colors hover:border-blush-300 hover:text-foreground"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">Rechercher…</span>
        <kbd className="hidden shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[0.65rem] font-semibold sm:block">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl gap-0 overflow-hidden p-0" hideClose>
          <DialogTitle className="sr-only">Recherche globale</DialogTitle>
          <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5">
            <div className="flex items-center gap-2.5 border-b border-border px-4">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Objectif, étape, page, note de journal…"
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>

            <Command.List className="max-h-[22rem] overflow-y-auto p-2">
              <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                {query.length < 2 ? "Tape au moins 2 caractères." : "Aucun résultat."}
              </Command.Empty>

              {visibleResults.goals.length > 0 && (
                <Command.Group heading={<GroupHeading>Objectifs</GroupHeading>}>
                  {visibleResults.goals.map((g) => (
                    <Item key={g.id} onSelect={() => go(`/objectifs/${g.slug}`)}>
                      <span className="text-base">{g.emoji ?? "🎯"}</span>
                      <span className="flex-1 truncate">{g.title}</span>
                      <span className="text-xs text-muted-foreground">{g.progress} %</span>
                    </Item>
                  ))}
                </Command.Group>
              )}

              {visibleResults.steps.length > 0 && (
                <Command.Group heading={<GroupHeading>Étapes</GroupHeading>}>
                  {visibleResults.steps.map((s) => (
                    <Item key={s.id} onSelect={() => go(`/objectifs/${s.goal.slug}`)}>
                      {s.done ? (
                        <CheckCircle2 className="size-4 text-aqua-500" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground" />
                      )}
                      <span className="flex-1 truncate">{s.title}</span>
                      <span className="truncate text-xs text-muted-foreground">{s.goal.title}</span>
                    </Item>
                  ))}
                </Command.Group>
              )}

              {visibleResults.journal.length > 0 && (
                <Command.Group heading={<GroupHeading>Journal</GroupHeading>}>
                  {visibleResults.journal.map((j) => (
                    <Item key={j.id} onSelect={() => go(`/journal?date=${j.date.slice(0, 10)}`)}>
                      <BookHeart className="size-4 text-lilac-400" />
                      <span className="flex-1 truncate">{j.whatIDid ?? "Entrée"}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(j.date)}</span>
                    </Item>
                  ))}
                </Command.Group>
              )}

              {!hasResults && (
                <>
                  <Command.Group heading={<GroupHeading>Actions</GroupHeading>}>
                    <Item onSelect={() => go("/objectifs?nouveau=1")}>
                      <Plus className="size-4 text-blush-500" /> Créer un objectif
                    </Item>
                    <Item onSelect={() => go("/journal?nouveau=1")}>
                      <BookHeart className="size-4 text-lilac-400" /> Écrire dans le journal
                    </Item>
                    <Item onSelect={() => go("/assistant")}>
                      <Target className="size-4 text-aqua-500" /> Demander à l&apos;assistant
                    </Item>
                  </Command.Group>

                  <Command.Group heading={<GroupHeading>Navigation</GroupHeading>}>
                    {NAV_ITEMS.map((item) => (
                      <Item key={item.href} onSelect={() => go(item.href)}>
                        <item.icon className="size-4 text-muted-foreground" />
                        <span className="flex-1">{item.label}</span>
                        <span className="truncate text-xs text-muted-foreground">{item.description}</span>
                      </Item>
                    ))}
                  </Command.Group>
                </>
              )}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </span>
  );
}

function Item({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm data-[selected=true]:bg-muted"
    >
      {children}
    </Command.Item>
  );
}
