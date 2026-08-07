import { Flame, Sparkles, Target, Trophy } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CircularProgress } from "@/components/ui/progress";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { GlowBlob, Sparkle, StarField } from "@/components/shared/decorations";
import { levelProgress } from "@/lib/gamification";
import { countdownParts, formatDate, getAge, initials } from "@/lib/utils";

/**
 * Bandeau d'accueil : qui je suis, où j'en suis, combien de temps il me reste.
 * C'est la première chose vue chaque jour — elle doit répondre à
 * « est-ce que j'avance ? » en une seconde.
 */
export function HeroHeader({
  name,
  image,
  birthDate,
  deadlineDate,
  questTitle,
  xp,
  streak,
  completed,
  total,
  overallProgress,
}: {
  name: string;
  image: string | null;
  birthDate: Date | null;
  deadlineDate: Date | null;
  questTitle: string;
  xp: number;
  streak: number;
  completed: number;
  total: number;
  overallProgress: number;
}) {
  const age = getAge(birthDate);
  const level = levelProgress(xp);
  const countdown = deadlineDate ? countdownParts(deadlineDate) : null;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-blush-100/90 via-lilac-100/80 to-aqua-100/80 p-6 shadow-card dark:border-white/5 dark:from-blush-900/40 dark:via-lilac-900/30 dark:to-aqua-900/25 sm:p-8">
      <StarField count={12} />
      <GlowBlob className="-right-16 -top-16 size-64" color="blush" />
      <GlowBlob className="-bottom-24 left-1/3 size-64" color="aqua" />

      <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
        {/* Identité */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative">
            <Avatar className="size-20 border-4 border-white shadow-lifted dark:border-ink-800 sm:size-24">
              {image && <AvatarImage src={image} alt="" />}
              <AvatarFallback className="text-2xl">{initials(name)}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-500 text-xs font-bold text-gold-900 shadow-glow-gold">
              {level.level}
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-blush-600 dark:text-blush-300">
              {questTitle}
            </p>
            <h1 className="mt-0.5 truncate text-3xl sm:text-4xl">
              Salut {name} <span className="inline-block animate-float">👋</span>
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {age != null && <span>{age} ans</span>}
              <span className="flex items-center gap-1 font-semibold text-gradient-brand">
                <Sparkle size={12} /> {level.title}
              </span>
              {streak > 0 && (
                <span className="flex items-center gap-1 font-semibold text-gold-600 dark:text-gold-300">
                  <Flame className="size-3.5" /> {streak} jours de série
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progression générale */}
        <div className="flex items-center gap-6 sm:gap-8">
          <CircularProgress value={overallProgress} size={116} strokeWidth={11}>
            <div className="text-center">
              <p className="font-display text-2xl leading-none">
                <AnimatedNumber value={overallProgress} />
                <span className="text-sm"> %</span>
              </p>
              <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">accompli</p>
            </div>
          </CircularProgress>

          <dl className="space-y-2.5 text-sm">
            <Stat icon={<Trophy className="size-4 text-gold-500" />} label="Objectifs réalisés">
              <AnimatedNumber value={completed} /> / {total}
            </Stat>
            <Stat icon={<Target className="size-4 text-blush-500" />} label="Restants">
              {total - completed}
            </Stat>
            <Stat icon={<Sparkles className="size-4 text-lilac-500" />} label="Expérience">
              <AnimatedNumber value={xp} /> XP
            </Stat>
          </dl>
        </div>
      </div>

      {/* Compte à rebours */}
      {countdown && deadlineDate && (
        <div className="relative mt-7 flex flex-wrap items-center gap-3 rounded-2xl border border-white/60 bg-white/60 px-4 py-3 backdrop-blur dark:border-white/5 dark:bg-white/5">
          <p className="text-sm text-muted-foreground">
            Échéance le <strong className="text-foreground">{formatDate(deadlineDate, "long")}</strong>
          </p>
          <div className="ml-auto flex items-center gap-3 sm:gap-5">
            <Countdown value={countdown.years} label="ans" />
            <Countdown value={countdown.months} label="mois" />
            <Countdown value={countdown.days} label="jours" />
            <Countdown value={countdown.totalDays} label="jours au total" muted />
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <dt className="sr-only">{label}</dt>
      <dd className="font-semibold tabular-nums">
        {children} <span className="font-normal text-muted-foreground">{label.toLowerCase()}</span>
      </dd>
    </div>
  );
}

function Countdown({ value, label, muted }: { value: number; label: string; muted?: boolean }) {
  return (
    <div className="text-center">
      <p className={muted ? "font-display text-lg text-muted-foreground" : "font-display text-xl"}>
        <AnimatedNumber value={value} />
      </p>
      <p className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
