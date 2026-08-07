import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Medal } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getProfile } from "@/server/queries/user";
import { collectBadgeStats } from "@/server/gamification";
import { badgeProgress, levelProgress, TIER_STYLES, type BadgeRule } from "@/lib/gamification";
import { LEVEL_TITLES } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

import { PageHeader } from "@/components/shared/page-header";
import { BadgeMedallion } from "@/components/gamification/badge-celebration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StarField } from "@/components/shared/decorations";

export const metadata: Metadata = { title: "Badges" };

const TIER_ORDER = ["legendary", "gold", "silver", "bronze"] as const;
const TIER_LABEL: Record<string, string> = {
  legendary: "Légendaires",
  gold: "Or",
  silver: "Argent",
  bronze: "Bronze",
};

export default async function BadgesPage() {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");

  // `userBadge` doit impérativement être filtré sur l'utilisateur : le
  // catalogue `badge` est global, les déblocages ne le sont pas.
  const [badges, owned, badgeStats] = await Promise.all([
    prisma.badge.findMany(),
    prisma.userBadge.findMany({ where: { userId: profile.id }, include: { badge: true } }),
    collectBadgeStats(profile.id),
  ]);

  const ownedByCode = new Map(owned.map((ub) => [ub.badge.code, ub]));
  const level = levelProgress(profile.xp);

  const grouped = TIER_ORDER.map((tier) => ({
    tier,
    badges: badges
      .filter((b) => b.tier === tier)
      .sort((a, b) => Number(ownedByCode.has(b.code)) - Number(ownedByCode.has(a.code))),
  })).filter((g) => g.badges.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Badges"
        icon={<Medal className="size-7 text-gold-500" />}
        description={`${owned.length} badges débloqués sur ${badges.length}. Chacun marque une étape réelle de ta quête.`}
      />

      {/* Niveau */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-gold-100 via-blush-100 to-lilac-100 p-6 dark:from-gold-900/40 dark:via-blush-900/30 dark:to-lilac-900/30">
        <StarField count={14} />
        <div className="relative flex flex-wrap items-center gap-6">
          <span className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-gold-300 to-gold-500 font-display text-3xl text-gold-900 shadow-glow-gold">
            {level.level}
          </span>
          <div className="min-w-52 flex-1">
            <p className="font-display text-2xl">
              Niveau {level.level} · <span className="text-gradient-gold">{level.title}</span>
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {level.xpIntoLevel} / {level.xpForNextLevel} XP vers le niveau suivant
            </p>
            <Progress value={level.percent} size="lg" className="mt-3" />
          </div>
        </div>

        {/* Échelle des titres */}
        <div className="relative mt-6 flex flex-wrap gap-2">
          {LEVEL_TITLES.map((title, i) => (
            <Badge
              key={title}
              variant={i <= Math.floor((level.level - 1) / 3) ? "gold" : "outline"}
              className={cn(i > Math.floor((level.level - 1) / 3) && "opacity-50")}
            >
              {title}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Collection */}
      {grouped.map(({ tier, badges: list }) => (
        <Card key={tier}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full bg-gradient-to-br", TIER_STYLES[tier].bg)} />
              {TIER_LABEL[tier]}
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {list.filter((b) => ownedByCode.has(b.code)).length}/{list.length}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((badge) => {
                const unlocked = ownedByCode.get(badge.code);
                const rule = badge.rule as unknown as BadgeRule;
                const progress = unlocked ? 1 : badgeProgress(rule, badgeStats);

                return (
                  <li
                    key={badge.code}
                    className={cn(
                      "flex gap-3.5 rounded-2xl border p-3.5 transition-colors",
                      unlocked ? "border-border bg-card" : "border-dashed border-border bg-muted/30",
                    )}
                  >
                    <BadgeMedallion badge={badge} size="md" locked={!unlocked} />

                    <div className="min-w-0 flex-1">
                      <p className={cn("font-display text-sm", !unlocked && "text-muted-foreground")}>
                        {badge.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{badge.description}</p>

                      {unlocked ? (
                        <p className="mt-1.5 text-[0.7rem] font-semibold text-gold-600 dark:text-gold-300">
                          Débloqué le {formatDate(unlocked.unlockedAt)}
                        </p>
                      ) : (
                        <div className="mt-2">
                          <Progress value={Math.round(progress * 100)} size="sm" />
                          <p className="mt-1 text-[0.7rem] text-muted-foreground">
                            {Math.round(progress * 100)} %
                            {badge.xpReward > 0 && ` · +${badge.xpReward} XP à la clé`}
                          </p>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
