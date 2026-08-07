import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Clock,
  Coins,
  Globe2,
  ListChecks,
  Medal,
  PenLine,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import {
  getActivityHeatmap,
  getCategoryBreakdown,
  getCompletionsByYear,
  getGlobalStats,
  getMoodTrend,
  getXpSeries,
} from "@/server/queries/analytics";
import { getGoals } from "@/server/queries/goals";
import { getProfile } from "@/server/queries/user";
import { levelProgress } from "@/lib/gamification";
import { STATUS_CONFIG, KANBAN_COLUMNS } from "@/lib/constants";
import { formatDuration, formatMoney } from "@/lib/utils";

import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ActivityHeatmap,
  CategoryBalance,
  CompletionsChart,
  FundingChart,
  MoodChart,
  StatusBars,
  XpChart,
} from "@/components/analytics/charts";

export const metadata: Metadata = { title: "Statistiques" };

export default async function AnalyticsPage() {
  const [profile, stats, xpSeries, completions, categories, heatmap, mood, goals] =
    await Promise.all([
      getProfile(),
      getGlobalStats(),
      getXpSeries(12),
      getCompletionsByYear(),
      getCategoryBreakdown(),
      getActivityHeatmap(),
      getMoodTrend(),
      getGoals(),
    ]);

  if (!profile || !stats) redirect("/connexion");

  const level = levelProgress(profile.xp);

  const statusData = KANBAN_COLUMNS.map((status) => ({
    label: STATUS_CONFIG[status].label,
    count: goals.filter((g) => g.status === status).length,
    color: STATUS_CONFIG[status].color,
  }));

  // Les cinq objectifs actifs les plus coûteux : c'est là que se joue l'épargne.
  const funding = goals
    .filter((g) => g.status !== "DONE" && g.status !== "ARCHIVED" && (g.estimatedCost ?? 0) > 0)
    .sort((a, b) => (b.estimatedCost ?? 0) - (a.estimatedCost ?? 0))
    .slice(0, 6)
    .map((g) => ({
      title: g.title.length > 26 ? `${g.title.slice(0, 24)}…` : g.title,
      saved: g.savedAmount,
      missing: Math.max(0, (g.estimatedCost ?? 0) - g.savedAmount),
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiques"
        icon={<BarChart3 className="size-7 text-aqua-500" />}
        description="Ce que tes chiffres racontent : rythme, régularité, argent, humeur."
      />

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={<Trophy className="size-4" />}
          label="Objectifs réalisés"
          value={stats.goalsCompleted}
          hint={`${stats.completionRate} % de la quête`}
          color="gold"
        />
        <StatTile
          icon={<Target className="size-4" />}
          label="Progression moyenne"
          value={stats.overallProgress}
          format="percent"
          hint={`${stats.goalsActive} objectifs actifs`}
          color="blush"
        />
        <StatTile
          icon={<ListChecks className="size-4" />}
          label="Étapes cochées"
          value={stats.stepsDone}
          hint={`sur ${stats.stepsTotal}`}
          color="lilac"
        />
        <StatTile
          icon={<Sparkles className="size-4" />}
          label="Expérience"
          value={stats.xpTotal}
          hint={`niveau ${level.level} · ${level.title}`}
          color="aqua"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={<Coins className="size-4" />}
          label="Argent épargné"
          value={stats.moneySaved}
          format="money"
          hint={`${formatMoney(stats.moneyNeeded)} restants à trouver`}
          color="gold"
        />
        <StatTile
          icon={<Coins className="size-4" />}
          label="Argent investi"
          value={stats.moneySpent}
          format="money"
          hint="dans les objectifs réalisés"
          color="peach"
        />
        <StatTile
          icon={<Globe2 className="size-4" />}
          label="Pays"
          value={stats.countriesCount}
          hint={stats.countries.slice(0, 3).join(", ") || "aucun pour l'instant"}
          color="aqua"
        />
        <StatTile
          icon={<Clock className="size-4" />}
          label="Temps investi"
          value={stats.hoursInvested}
          hint={formatDuration(stats.hoursInvested)}
          suffix="h"
          color="lilac"
        />
      </div>

      {/* Niveau */}
      <Card className="p-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-base">
            Niveau {level.level} · <span className="text-gradient-brand">{level.title}</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            {level.xpIntoLevel} / {level.xpForNextLevel} XP vers le niveau {level.level + 1}
          </p>
        </div>
        <Progress value={level.percent} size="lg" />
      </Card>

      {/* Graphiques */}
      <div className="grid gap-6 lg:grid-cols-2">
        <XpChart data={xpSeries} />
        <CompletionsChart data={completions} />
        <StatusBars data={statusData} />
        <CategoryBalance data={categories} />
        <FundingChart data={funding} />
        <MoodChart data={mood} />
      </div>

      <ActivityHeatmap days={heatmap} />

      {/* Détail par catégorie */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenLine className="size-4 text-lilac-500" /> Détail par catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {categories.map((c) => (
                <li key={c.name}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span>
                      {c.emoji} {c.name}
                    </span>
                    <span className="text-muted-foreground">
                      {c.done}/{c.total} · {c.progress} %
                    </span>
                  </div>
                  <Progress value={c.progress} color={c.color} size="sm" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Badges & journal */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={<Medal className="size-4" />}
          label="Badges"
          value={stats.badgesUnlocked}
          hint="débloqués"
          color="gold"
        />
        <StatTile
          icon={<PenLine className="size-4" />}
          label="Entrées de journal"
          value={stats.journalEntries}
          color="lilac"
        />
        <StatTile
          icon={<Sparkles className="size-4" />}
          label="Série actuelle"
          value={profile.streakCurrent}
          suffix="j"
          hint={`record : ${profile.streakLongest} jours`}
          color="blush"
        />
        <StatTile
          icon={<Target className="size-4" />}
          label="Objectifs restants"
          value={stats.goalsActive}
          color="aqua"
        />
      </div>
    </div>
  );
}
