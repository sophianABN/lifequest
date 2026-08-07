"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Mood } from "@prisma/client";
import { BookHeart, Save } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BadgeCelebration, type UnlockedBadge } from "@/components/gamification/badge-celebration";
import { MOOD_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { saveJournalEntry } from "@/server/actions/journal";

export interface JournalDraft {
  date: string;
  whatIDid: string;
  whatILearned: string;
  notes: string;
  gratitude: string;
  mood: Mood;
  goalId: string | null;
}

/**
 * Éditeur de l'entrée du jour.
 *
 * Quatre champs courts plutôt qu'une grande zone de texte : une page blanche
 * décourage, trois questions précises se remplissent en deux minutes.
 */
export function JournalEditor({
  initial,
  goals,
}: {
  initial: JournalDraft;
  goals: { id: string; title: string; emoji: string | null }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const [celebration, setCelebration] = React.useState<UnlockedBadge[]>([]);

  // Changer de date recharge l'entrée depuis le serveur : on réinitialise le
  // brouillon pendant le rendu plutôt que dans un effet.
  const [syncedInitial, setSyncedInitial] = React.useState(initial);
  if (syncedInitial !== initial) {
    setSyncedInitial(initial);
    setDraft(initial);
  }

  const set = <K extends keyof JournalDraft>(key: K, value: JournalDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    const result = await saveJournalEntry({
      ...draft,
      goalId: draft.goalId === "none" ? null : draft.goalId,
    });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Journal enregistré 📖");
    if (result.badges?.length) setCelebration(result.badges as UnlockedBadge[]);
    router.refresh();
  };

  const changeDate = (date: string) => {
    // La date pilote l'entrée affichée : elle passe par l'URL pour que la
    // navigation arrière fonctionne et que le lien soit partageable.
    const params = new URLSearchParams(searchParams);
    params.set("date", date);
    router.push(`/journal?${params.toString()}`);
  };

  return (
    <>
      <Card variant="gradient">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookHeart className="size-4 text-lilac-500" /> Aujourd&apos;hui
          </CardTitle>
          <Input
            type="date"
            value={draft.date}
            onChange={(e) => changeDate(e.target.value)}
            className="h-9 w-auto"
            aria-label="Date de l'entrée"
          />
        </CardHeader>

        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {/* Humeur */}
            <div className="space-y-2">
              <Label>Humeur du jour</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(MOOD_CONFIG) as [Mood, (typeof MOOD_CONFIG)[Mood]][]).map(
                  ([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set("mood", key)}
                      aria-pressed={draft.mood === key}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all",
                        draft.mood === key
                          ? "scale-105 border-blush-300 bg-blush-100 font-semibold dark:bg-blush-900/40"
                          : "border-border text-muted-foreground hover:border-blush-300",
                      )}
                    >
                      <span className="text-base">{config.emoji}</span>
                      {config.label}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="did">Ce que j&apos;ai fait</Label>
                <Textarea
                  id="did"
                  rows={3}
                  value={draft.whatIDid}
                  onChange={(e) => set("whatIDid", e.target.value)}
                  placeholder="Même une petite chose compte."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="learned">Ce que j&apos;ai appris</Label>
                <Textarea
                  id="learned"
                  rows={3}
                  value={draft.whatILearned}
                  onChange={(e) => set("whatILearned", e.target.value)}
                  placeholder="Sur toi, sur les autres, sur le monde."
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="gratitude">Gratitude</Label>
                <Input
                  id="gratitude"
                  value={draft.gratitude}
                  onChange={(e) => set("gratitude", e.target.value)}
                  placeholder="Une chose pour laquelle tu es reconnaissante."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Objectif lié</Label>
                <Select
                  value={draft.goalId ?? "none"}
                  onValueChange={(v) => set("goalId", v === "none" ? null : v)}
                >
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
              <Label htmlFor="notes">Notes libres</Label>
              <Textarea
                id="notes"
                rows={3}
                value={draft.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Tout ce qui ne rentre pas ailleurs."
              />
            </div>

            <Button type="submit" loading={pending}>
              <Save /> Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <BadgeCelebration badges={celebration} onDone={() => setCelebration([])} />
    </>
  );
}
