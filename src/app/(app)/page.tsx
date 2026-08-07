import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Coins, Flame, Globe2, ListChecks, Medal, Sparkles, Target } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getProfile, getDailyQuote } from "@/server/queries/user";
import { getGoals, getScorableGoals, getUserContext } from "@/server/queries/goals";
import { getGlobalStats, getXpSeries } from "@/server/queries/analytics";
import { almostReady, analyzeAll, nearlyDone, recommendToday } from "@/lib/intelligence/engine";
import { formatMoney } from "@/lib/utils";

import { HeroHeader } from "@/components/dashboard/hero-header";
import { TodayFocus } from "@/components/dashboard/today-focus";
import { QuoteCard } from "@/components/dashboard/quote-card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Upcoming, type UpcomingItem } from "@/components/dashboard/upcoming";
import { RecentWins, type Win } from "@/components/dashboard/recent-wins";
import { BadgesStrip } from "@/components/dashboard/badges-strip";
import { GoalCard } from "@/components/goals/goal-card";
import { XpChart } from "@/components/analytics/charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Sparkle } from "@/components/shared/decorations";

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");

  // On inclut la veille dans « à venir » : une échéance d'hier soir reste
  // pertinente ce matin.
  // La règle « impure function during render » vise les composants clients,
  // qui peuvent être rendus plusieurs fois ; ce composant serveur asynchrone
  // s'exécute une fois par requête, lire l'heure y est le comportement voulu.
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 86_400_000);

  // Toutes ces lectures sont indépendantes : on les lance en parallèle plutôt
  // que d'enchaîner huit allers-retours vers PostgreSQL.
  const [goals, scorable, context, quote, stats, xpSeries, events, recentSteps, recentBadges] =
    await Promise.all([
      getGoals(),
      getScorableGoals(),
      getUserContext(),
      getDailyQuote(),
      getGlobalStats(),
      getXpSeries(12),
      prisma.calendarEvent.findMany({
        where: { userId: profile.id, start: { gte: since }, done: false },
        orderBy: { start: "asc" },
        take: 6,
        include: { goal: { select: { slug: true } } },
      }),
      prisma.step.findMany({
        where: { goal: { userId: profile.id }, done: true, completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        take: 4,
        include: { goal: { select: { slug: true, emoji: true, color: true } } },
      }),
      prisma.userBadge.findMany({
        where: { userId: profile.id },
        orderBy: { unlockedAt: "desc" },
        take: 6,
        include: { badge: true },
      }),
    ]);

  const goalsById = new Map(goals.map((g) => [g.id, g]));
  const { byId: analysisById } = context ? analyzeAll(scorable, context) : { byId: new Map() };

  // ── Objectif du jour ────────────────────────────────────────────────────
  const recommendation = context ? recommendToday(scorable, context) : null;
  const focusGoal = recommendation ? goalsById.get(recommendation.goal.id) : null;
  const focusNextStep = focusGoal
    ? await prisma.step.findFirst({
        where: { goalId: focusGoal.id, done: false },
        orderBy: [{ dueDate: "asc" }, { order: "asc" }],
        select: { id: true, title: true },
      })
    : null;

  // ── Sélections dérivées ─────────────────────────────────────────────────
  const priorityGoals = scorable
    .filter((g) => g.status !== "DONE" && g.status !== "ARCHIVED")
    .map((g) => ({ goal: goalsById.get(g.id)!, analysis: analysisById.get(g.id)! }))
    .filter((x) => x.goal && x.analysis && x.goal.id !== focusGoal?.id)
    .sort((a, b) => b.analysis.score - a.analysis.score)
    .slice(0, 3);

  const soon = context ? almostReady(scorable, context, 3) : [];
  const almostDone = nearlyDone(scorable, 3)
    .map((g) => goalsById.get(g.id))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  const finalGoal = goals.find((g) => g.isFinal);

  // ── Dernières réussites : objectifs, étapes et badges fusionnés ─────────
  const wins: Win[] = [
    ...goals
      .filter((g) => g.status === "DONE" && g.completedAt)
      .map((g) => ({
        id: g.id,
        title: g.title,
        emoji: g.emoji,
        color: g.color,
        slug: g.slug,
        at: g.completedAt!,
        kind: "goal" as const,
      })),
    ...recentSteps.map((s) => ({
      id: s.id,
      title: s.title,
      emoji: s.goal.emoji,
      color: s.goal.color,
      slug: s.goal.slug,
      at: s.completedAt!,
      kind: "step" as const,
    })),
    ...recentBadges.map((ub) => ({
      id: ub.badgeId,
      title: ub.badge.name,
      emoji: "🏅",
      color: "gold",
      slug: null,
      at: ub.unlockedAt,
      kind: "badge" as const,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  const upcoming: UpcomingItem[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    color: e.color,
    goalSlug: e.goal?.slug ?? null,
    kind: e.kind,
    done: e.done,
  }));

  return (
    <div className="space-y-6">
      <HeroHeader
        name={profile.name}
        image={profile.image}
        birthDate={profile.birthDate}
        deadlineDate={profile.deadlineDate}
        questTitle={profile.questTitle}
        xp={profile.xp}
        streak={profile.streakCurrent}
        completed={stats?.goalsCompleted ?? 0}
        total={stats?.goalsTotal ?? 0}
        overallProgress={stats?.overallProgress ?? 0}
      />

      {/* Statistiques clés */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={<Target className="size-4" />}
          label="Objectifs actifs"
          value={stats?.goalsActive ?? 0}
          hint={`${stats?.goalsCompleted ?? 0} déjà réalisés`}
          color="blush"
        />
        <StatTile
          icon={<ListChecks className="size-4" />}
          label="Étapes cochées"
          value={stats?.stepsDone ?? 0}
          hint={`sur ${stats?.stepsTotal ?? 0}`}
          color="lilac"
        />
        <StatTile
          icon={<Coins className="size-4" />}
          label="Épargné"
          value={stats?.moneySaved ?? 0}
          format="money"
          hint={`${formatMoney(stats?.moneyNeeded ?? 0)} restants`}
          color="gold"
        />
        <StatTile
          icon={<Globe2 className="size-4" />}
          label="Pays"
          value={stats?.countriesCount ?? 0}
          hint="objectifs réalisés à l'étranger"
          color="aqua"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {focusGoal && recommendation ? (
            <TodayFocus goal={focusGoal} analysis={recommendation.analysis} nextStep={focusNextStep} />
          ) : (
            <EmptyState
              title="Aucun objectif actif"
              description="Crée ton premier objectif et l'application te dira par où commencer."
              action={
                <Button asChild>
                  <Link href="/objectifs?nouveau=1">Créer un objectif</Link>
                </Button>
              }
            />
          )}

          {/* Objectifs prioritaires */}
          {priorityGoals.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-xl">
                  <Flame className="size-5 text-blush-500" /> Objectifs prioritaires
                </h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/objectifs">
                    Tous les objectifs <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {priorityGoals.map(({ goal, analysis }, i) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    index={i}
                    score={analysis.score}
                    readiness={analysis.readiness}
                    compact
                  />
                ))}
              </div>
            </section>
          )}

          {/* Presque terminés */}
          {almostDone.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl">
                <Sparkle size={18} className="text-gold-500" /> Presque terminés
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {almostDone.map((goal, i) => (
                  <GoalCard key={goal.id} goal={goal} index={i} compact />
                ))}
              </div>
            </section>
          )}

          <XpChart data={xpSeries} />
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {quote && <QuoteCard text={quote.text} author={quote.author} />}

          <Upcoming items={upcoming} />

          {/* Bientôt réalisables */}
          {soon.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-4 text-aqua-500" /> Bientôt réalisables
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {soon.map(({ goal, analysis }) => {
                  const display = goalsById.get(goal.id);
                  if (!display) return null;
                  return (
                    <Link
                      key={goal.id}
                      href={`/objectifs/${display.slug}`}
                      className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted"
                    >
                      <span className="text-lg">{display.emoji ?? "🎯"}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{display.title}</span>
                      {analysis.monthsToAfford != null && analysis.monthsToAfford > 0 && (
                        <span className="shrink-0 text-xs font-semibold text-aqua-600 dark:text-aqua-300">
                          {analysis.monthsToAfford} mois
                        </span>
                      )}
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <RecentWins wins={wins} />

          <BadgesStrip
            badges={recentBadges.map((ub) => ({
              code: ub.badge.code,
              name: ub.badge.name,
              description: ub.badge.description,
              icon: ub.badge.icon,
              tier: ub.badge.tier,
              unlockedAt: ub.unlockedAt,
            }))}
          />

          {/* Rappel de l'objectif final */}
          {finalGoal && (
            <Link href={`/objectifs/${finalGoal.slug}`} className="block">
              <Card className="relative overflow-hidden border-none p-0 shadow-glow-gold">
                <div className="bg-holo p-5 text-ink-900">
                  <p className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-widest">
                    <Medal className="size-3.5" /> Objectif final
                  </p>
                  <p className="mt-2 font-display text-xl leading-tight">
                    {finalGoal.emoji} {finalGoal.title}
                  </p>
                  <p className="mt-1.5 text-sm text-ink-800">
                    {finalGoal.progress} % — la ligne d&apos;arrivée de toute la quête.
                  </p>
                </div>
              </Card>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
