import Link from "next/link";
import { Medal } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeIcon } from "@/lib/badge-icons";
import { TIER_STYLES } from "@/lib/gamification";
import { cn, relativeTime } from "@/lib/utils";

export interface BadgeItem {
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  unlockedAt: Date;
}

/**
 * Bandeau des derniers badges obtenus.
 *
 * L'infobulle utilise l'attribut natif `title` plutôt qu'un Tooltip Radix :
 * ce composant est rendu côté serveur, et un `asChild` Radix ne peut pas
 * recevoir d'enfant traversant la frontière serveur/client.
 */
export function BadgesStrip({ badges }: { badges: BadgeItem[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Medal className="size-4 text-gold-500" /> Badges récents
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/badges">Tout voir</Link>
        </Button>
      </CardHeader>

      <CardContent>
        {badges.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Tes premiers badges arrivent vite.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {badges.map((badge) => {
              const tier = TIER_STYLES[badge.tier] ?? TIER_STYLES.bronze;

              return (
                <li key={badge.code}>
                  <Link
                    href="/badges"
                    title={`${badge.name} — ${badge.description} (débloqué ${relativeTime(badge.unlockedAt)})`}
                    aria-label={`${badge.name} : ${badge.description}`}
                    className={cn(
                      "grid size-14 place-items-center rounded-2xl bg-gradient-to-br ring-2 transition-transform hover:scale-105",
                      tier.bg,
                      tier.ring,
                      tier.text,
                      tier.glow,
                    )}
                  >
                    <BadgeIcon name={badge.icon} className="size-6" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
