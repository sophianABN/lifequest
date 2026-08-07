import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookHeart, Flame } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getProfile } from "@/server/queries/user";
import { getGoals } from "@/server/queries/goals";
import { MOOD_CONFIG } from "@/lib/constants";
import { formatDate, startOfDay, toDateInput } from "@/lib/utils";

import { PageHeader } from "@/components/shared/page-header";
import { JournalEditor, type JournalDraft } from "@/components/journal/journal-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/shared/empty-state";
import { DoodleHeart } from "@/components/shared/decorations";

export const metadata: Metadata = { title: "Journal" };

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  if (!profile) redirect("/connexion");

  const date = startOfDay(params.date ? new Date(params.date) : new Date());

  const [entry, recent, goals, total] = await Promise.all([
    prisma.journalEntry.findUnique({
      where: { userId_date: { userId: profile.id, date } },
      include: { photos: true },
    }),
    prisma.journalEntry.findMany({
      where: { userId: profile.id },
      orderBy: { date: "desc" },
      take: 30,
      include: { goal: { select: { slug: true, title: true, emoji: true } } },
    }),
    getGoals(),
    prisma.journalEntry.count({ where: { userId: profile.id } }),
  ]);

  const draft: JournalDraft = {
    date: toDateInput(date),
    whatIDid: entry?.whatIDid ?? "",
    whatILearned: entry?.whatILearned ?? "",
    notes: entry?.notes ?? "",
    gratitude: entry?.gratitude ?? "",
    mood: entry?.mood ?? "NEUTRAL",
    goalId: entry?.goalId ?? null,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal"
        icon={<BookHeart className="size-7 text-lilac-500" />}
        description="Trois questions par jour. Dans deux ans, ces pages seront la preuve de tout ce que tu as traversé."
        actions={
          <>
            <Badge variant="lilac">{total} entrées</Badge>
            {profile.streakCurrent > 0 && (
              <Badge variant="gold">
                <Flame /> {profile.streakCurrent} jours
              </Badge>
            )}
          </>
        }
      />

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-3xl" />}>
        <JournalEditor
          initial={draft}
          goals={goals
            .filter((g) => g.status !== "ARCHIVED")
            .map((g) => ({ id: g.id, title: g.title, emoji: g.emoji }))}
        />
      </Suspense>

      {/* Historique */}
      <Card>
        <CardHeader>
          <CardTitle>Les 30 derniers jours</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              title="Ton journal est vide"
              description="Écris ta première entrée aujourd'hui — même trois mots suffisent."
              illustration={<DoodleHeart className="w-16" />}
            />
          ) : (
            <ol className="space-y-2">
              {recent.map((item) => {
                const mood = MOOD_CONFIG[item.mood];
                return (
                  <li key={item.id}>
                    <Link
                      href={`/journal?date=${toDateInput(item.date)}`}
                      className="flex gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-muted"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-lg">
                        {mood.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {formatDate(item.date, "long")}
                          {item.goal && ` · ${item.goal.emoji} ${item.goal.title}`}
                        </p>
                        {item.whatIDid && <p className="truncate text-sm">{item.whatIDid}</p>}
                        {item.whatILearned && (
                          <p className="truncate text-xs italic text-muted-foreground">
                            {item.whatILearned}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
