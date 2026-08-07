"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Flame, Sparkles } from "lucide-react";

import { cn, countdownParts } from "@/lib/utils";
import { levelProgress } from "@/lib/gamification";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/shared/logo";
import { NAV_SECTIONS } from "./nav-config";

export interface SidebarUser {
  name: string;
  xp: number;
  streakCurrent: number;
  deadlineDate: Date | null;
  questTitle: string;
}

export function Sidebar({ user, onNavigate }: { user: SidebarUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const level = levelProgress(user.xp);
  const countdown = user.deadlineDate ? countdownParts(user.deadlineDate) : null;

  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-6" aria-label="Navigation principale">
      {/* Logo */}
      <Link href="/" onClick={onNavigate} className="px-2">
        <Logo size={40} subtitle={user.questTitle} />
      </Link>

      {/* Carte de niveau */}
      <div className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-soft">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-sm">
            Niveau {level.level} · <span className="text-gradient-brand">{level.title}</span>
          </span>
          {user.streakCurrent > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold text-gold-600 dark:text-gold-300">
              <Flame className="size-3.5" />
              {user.streakCurrent}
            </span>
          )}
        </div>
        <Progress value={level.percent} size="sm" className="mt-2.5" />
        <p className="mt-1.5 text-[0.7rem] text-muted-foreground">
          {level.xpIntoLevel} / {level.xpForNextLevel} XP vers le niveau {level.level + 1}
        </p>
      </div>

      {/* Sections de navigation */}
      <div className="flex-1 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="mb-1.5 px-3 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground/70">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        active ? "text-blush-700 dark:text-blush-200" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active"
                          className="absolute inset-0 -z-10 rounded-xl bg-blush-100 dark:bg-blush-900/40"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                      <item.icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Compte à rebours de la quête */}
      {countdown && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blush-100 to-lilac-100 p-3.5 text-center dark:from-blush-900/40 dark:to-lilac-900/40">
          <Sparkles className="absolute -right-2 -top-2 size-12 text-white/40 dark:text-white/10" />
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-blush-700 dark:text-blush-200">
            Temps restant
          </p>
          <p className="mt-0.5 font-display text-2xl">
            {countdown.years} <span className="text-sm font-normal">ans</span> {countdown.months}{" "}
            <span className="text-sm font-normal">mois</span>
          </p>
          <p className="text-[0.7rem] text-muted-foreground">soit {countdown.totalDays} jours</p>
        </div>
      )}
    </nav>
  );
}
