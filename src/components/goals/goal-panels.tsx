"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, ListChecks, MessageCircle, Plus, Send, Trash2, Waypoints } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { celebrateStep } from "@/lib/confetti";
import { cn, initials, relativeTime } from "@/lib/utils";
import { STATUS_CONFIG } from "@/lib/constants";
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "@/server/actions/steps";
import { addComment, deleteComment } from "@/server/actions/goals";

/** Checklist rapide : micro-tâches sans date ni hiérarchie. */
export function ChecklistPanel({
  goalId,
  items,
}: {
  goalId: string;
  items: { id: string; label: string; done: boolean }[];
}) {
  const router = useRouter();
  const [local, setLocal] = React.useState(items);
  const [label, setLabel] = React.useState("");

  // Resynchronisation après `router.refresh()`, ajustée pendant le rendu.
  const [syncedItems, setSyncedItems] = React.useState(items);
  if (syncedItems !== items) {
    setSyncedItems(items);
    setLocal(items);
  }

  const toggle = async (id: string, event: React.MouseEvent) => {
    const item = local.find((i) => i.id === id);
    if (!item) return;
    setLocal((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
    if (!item.done) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      celebrateStep({ x: rect.left / window.innerWidth, y: rect.top / window.innerHeight });
    }
    await toggleChecklistItem(id);
    router.refresh();
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    await addChecklistItem(goalId, label);
    setLabel("");
    router.refresh();
  };

  const done = local.filter((i) => i.done).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="size-4 text-aqua-500" /> Checklist
          {local.length > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {done}/{local.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-1">
        {local.map((item) => (
          <div key={item.id} className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted/60">
            <Checkbox
              checked={item.done}
              onClick={(e) => toggle(item.id, e)}
              className="size-4"
              aria-label={item.label}
            />
            <span className={cn("flex-1 text-sm", item.done && "text-muted-foreground line-through")}>
              {item.label}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100"
              aria-label="Supprimer"
              onClick={async () => {
                await deleteChecklistItem(item.id);
                router.refresh();
              }}
            >
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        ))}

        <form onSubmit={add} className="flex gap-2 pt-1">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ajouter un élément…"
            className="h-9"
          />
          <Button type="submit" variant="ghost" size="icon" aria-label="Ajouter">
            <Plus />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Fil de commentaires — le carnet de bord de l'objectif. */
export function CommentsPanel({
  goalId,
  comments,
  currentUser,
}: {
  goalId: string;
  comments: { id: string; body: string; createdAt: Date; user: { name: string; image: string | null } }[];
  currentUser: { name: string; image: string | null };
}) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPending(true);
    const result = await addComment(goalId, body);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setBody("");
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="size-4 text-lilac-500" /> Notes &amp; commentaires
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={submit} className="flex gap-3">
          <Avatar className="mt-0.5 size-8 shrink-0">
            {currentUser.image && <AvatarImage src={currentUser.image} alt="" />}
            <AvatarFallback className="text-[0.65rem]">{initials(currentUser.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Un devis reçu, une idée, un contact…"
              rows={2}
              className="min-h-16"
            />
            <Button type="submit" size="sm" loading={pending} disabled={!body.trim()}>
              <Send /> Publier
            </Button>
          </div>
        </form>

        {comments.length > 0 && (
          <ul className="space-y-3 border-t border-border pt-4">
            {comments.map((c) => (
              <li key={c.id} className="group flex gap-3">
                <Avatar className="size-8 shrink-0">
                  {c.user.image && <AvatarImage src={c.user.image} alt="" />}
                  <AvatarFallback className="text-[0.65rem]">{initials(c.user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 rounded-2xl bg-muted/60 px-3.5 py-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{c.user.name}</span>
                    <span className="text-xs text-muted-foreground">{relativeTime(c.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.body}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100"
                  aria-label="Supprimer le commentaire"
                  onClick={async () => {
                    await deleteComment(c.id);
                    router.refresh();
                  }}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Graphe de dépendances : ce qui doit être fait avant, ce que cela débloque. */
export function DependenciesPanel({
  dependsOn,
  requiredFor,
}: {
  dependsOn: { id: string; slug: string; title: string; emoji: string | null; status: string; progress: number }[];
  requiredFor: { id: string; slug: string; title: string; emoji: string | null; status: string }[];
}) {
  if (dependsOn.length === 0 && requiredFor.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Waypoints className="size-4 text-lilac-500" /> Enchaînement
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {dependsOn.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              À terminer avant
            </p>
            <ul className="space-y-1.5">
              {dependsOn.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/objectifs/${g.slug}`}
                    className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-3 py-2 transition-colors hover:bg-muted"
                  >
                    <span className="text-base">{g.emoji ?? "🎯"}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{g.title}</span>
                    {g.status === "DONE" ? (
                      <CheckCircle2 className="size-4 shrink-0 text-aqua-500" />
                    ) : (
                      <Badge variant="muted" className="shrink-0">
                        {g.progress} %
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {requiredFor.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Débloque ensuite
            </p>
            <ul className="space-y-1.5">
              {requiredFor.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/objectifs/${g.slug}`}
                    className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-3 py-2 transition-colors hover:bg-muted"
                  >
                    <span className="text-base">{g.emoji ?? "🎯"}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{g.title}</span>
                    <Badge variant="outline" className="shrink-0">
                      {STATUS_CONFIG[g.status as keyof typeof STATUS_CONFIG].label}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
