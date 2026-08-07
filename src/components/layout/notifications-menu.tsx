"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  CakeSlice,
  CalendarClock,
  Flame,
  Heart,
  Medal,
  TimerReset,
} from "lucide-react";
import type { NotificationType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/misc";
import { relativeTime, cn } from "@/lib/utils";
import { markAllNotificationsRead, markNotificationRead } from "@/server/actions/notifications";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
}

const ICONS: Record<NotificationType, React.ElementType> = {
  REMINDER: CalendarClock,
  STEP_OVERDUE: TimerReset,
  GOAL_DEADLINE: CalendarClock,
  MOTIVATION: Heart,
  BADGE_UNLOCKED: Medal,
  BIRTHDAY: CakeSlice,
  STREAK: Flame,
};

const TONES: Record<NotificationType, string> = {
  REMINDER: "bg-aqua-100 text-aqua-700 dark:bg-aqua-900/50 dark:text-aqua-200",
  STEP_OVERDUE: "bg-peach-300/30 text-gold-800 dark:text-peach-300",
  GOAL_DEADLINE: "bg-gold-100 text-gold-700 dark:bg-gold-900/50 dark:text-gold-200",
  MOTIVATION: "bg-blush-100 text-blush-700 dark:bg-blush-900/50 dark:text-blush-200",
  BADGE_UNLOCKED: "bg-gold-100 text-gold-700 dark:bg-gold-900/50 dark:text-gold-200",
  BIRTHDAY: "bg-lilac-100 text-lilac-700 dark:bg-lilac-900/50 dark:text-lilac-200",
  STREAK: "bg-blush-100 text-blush-700 dark:bg-blush-900/50 dark:text-blush-200",
};

export function NotificationsMenu({ notifications }: { notifications: NotificationItem[] }) {
  const [isPending, startTransition] = React.useTransition();
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${unread} non lues)`}>
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-blush-500 text-[0.6rem] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="font-display text-base">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => void markAllNotificationsRead())}
              className="text-xs font-semibold text-blush-600 hover:underline dark:text-blush-300"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>
        <Separator />

        <ul className="max-h-[24rem] overflow-y-auto p-1.5">
          {notifications.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">
              Rien de neuf. Profites-en pour avancer 💫
            </li>
          )}

          {notifications.map((n) => {
            const Icon = ICONS[n.type];
            const content = (
              <div className="flex gap-3">
                <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl", TONES[n.type])}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-[0.65rem] text-muted-foreground/80">{relativeTime(n.createdAt)}</p>
                </div>
                {!n.readAt && <span className="mt-2 size-2 shrink-0 rounded-full bg-blush-400" />}
              </div>
            );

            return (
              <li key={n.id}>
                {n.href ? (
                  <Link
                    href={n.href}
                    onClick={() => startTransition(() => void markNotificationRead(n.id))}
                    className={cn(
                      "block rounded-xl p-2.5 transition-colors hover:bg-muted",
                      !n.readAt && "bg-blush-50/70 dark:bg-blush-900/15",
                    )}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={cn("rounded-xl p-2.5", !n.readAt && "bg-blush-50/70 dark:bg-blush-900/15")}>
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
