import Link from "next/link";
import { PartyPopper } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, relativeTime } from "@/lib/utils";
import { colorClasses } from "@/lib/constants";

export interface Win {
  id: string;
  title: string;
  emoji: string | null;
  color: string;
  slug: string | null;
  at: Date;
  kind: "goal" | "step" | "badge";
}

const KIND_LABEL: Record<Win["kind"], string> = {
  goal: "Objectif terminé",
  step: "Étape cochée",
  badge: "Badge débloqué",
};

/**
 * Dernières réussites, tous types confondus. Voir ses propres victoires
 * récentes est le levier de motivation le plus fiable de l'application.
 */
export function RecentWins({ wins }: { wins: Win[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PartyPopper className="size-4 text-gold-500" /> Dernières réussites
        </CardTitle>
      </CardHeader>
      <CardContent>
        {wins.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Coche ta première étape pour lancer la machine ✨
          </p>
        ) : (
          <ul className="space-y-1">
            {wins.map((win) => {
              const colors = colorClasses(win.color);
              const row = (
                <div className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl text-base", colors.softBg)}>
                    {win.emoji ?? (win.kind === "badge" ? "🏅" : "✅")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{win.title}</p>
                    <p className="text-xs text-muted-foreground">{KIND_LABEL[win.kind]}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(win.at)}</span>
                </div>
              );
              return (
                <li key={`${win.kind}-${win.id}`}>
                  {win.slug ? <Link href={`/objectifs/${win.slug}`}>{row}</Link> : row}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
