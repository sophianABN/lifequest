import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDate, isSameDay, relativeTime } from "@/lib/utils";
import { colorClasses } from "@/lib/constants";

export interface UpcomingItem {
  id: string;
  title: string;
  start: Date;
  color: string | null;
  goalSlug: string | null;
  kind: string;
  done: boolean;
}

/** Les prochaines échéances, tous types confondus (étapes datées, rappels, événements). */
export function Upcoming({ items }: { items: UpcomingItem[] }) {
  const today = new Date();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-4 text-aqua-500" /> À venir
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/calendrier">Calendrier</Link>
        </Button>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Rien de prévu. Planifie une étape depuis un objectif.
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => {
              const isToday = isSameDay(new Date(item.start), today);
              const isPast = new Date(item.start) < today && !isToday;
              const colors = colorClasses(item.color ?? "lilac");

              const row = (
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted",
                    item.done && "opacity-50",
                  )}
                >
                  <span className={cn("h-8 w-1 shrink-0 rounded-full", colors.bg)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-medium", item.done && "line-through")}>
                      {item.title}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {isToday ? "Aujourd'hui" : formatDate(item.start)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-semibold",
                      isPast ? "text-destructive" : isToday ? "text-blush-600 dark:text-blush-300" : "text-muted-foreground",
                    )}
                  >
                    {isToday ? "aujourd'hui" : relativeTime(item.start)}
                  </span>
                </div>
              );

              return (
                <li key={item.id}>
                  {item.goalSlug ? <Link href={`/objectifs/${item.goalSlug}`}>{row}</Link> : row}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
