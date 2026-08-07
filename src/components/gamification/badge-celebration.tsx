"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { BadgeIcon } from "@/lib/badge-icons";
import { celebrateBadge, celebrateFinal } from "@/lib/confetti";
import { TIER_STYLES } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export interface UnlockedBadge {
  code: string;
  name: string;
  description?: string;
  icon: string;
  tier: string;
}

/**
 * Superposition de célébration quand un badge se débloque.
 *
 * Les badges arrivent en file : on les affiche un par un, 2,4 s chacun.
 * Trois pop-ups simultanés seraient illisibles — et gâcheraient le moment.
 */
export function BadgeCelebration({
  badges,
  onDone,
}: {
  badges: UnlockedBadge[];
  onDone: () => void;
}) {
  const [index, setIndex] = React.useState(0);

  // Nouvelle salve de badges : on repart du premier. Ajusté pendant le rendu
  // plutôt que dans un effet, pour éviter une passe d'affichage avec l'index
  // de la salve précédente.
  const [syncedBadges, setSyncedBadges] = React.useState(badges);
  if (syncedBadges !== badges) {
    setSyncedBadges(badges);
    setIndex(0);
  }

  const badge = badges[index];

  React.useEffect(() => {
    if (badges.length === 0) return;

    // File épuisée : on rend la main au parent, qui vide la liste.
    if (!badge) {
      onDone();
      return;
    }

    if (badge.tier === "legendary") celebrateFinal();
    else celebrateBadge();

    const timer = setTimeout(() => setIndex((i) => i + 1), 2400);
    return () => clearTimeout(timer);
  }, [badges, badge, onDone]);

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          key={badge.code}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[60] grid place-items-center p-6"
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={{ scale: 0.7, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: -20 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="flex flex-col items-center gap-4 rounded-3xl border border-white/60 bg-card/95 px-10 py-8 text-center shadow-lifted backdrop-blur dark:border-white/10"
          >
            <BadgeMedallion badge={badge} />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gold-600 dark:text-gold-300">
                Badge débloqué
              </p>
              <p className="mt-1 font-display text-2xl">{badge.name}</p>
              {badge.description && (
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">{badge.description}</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function BadgeMedallion({
  badge,
  size = "lg",
  locked,
}: {
  badge: { icon: string; tier: string };
  size?: "sm" | "md" | "lg";
  locked?: boolean;
}) {
  const tier = TIER_STYLES[badge.tier] ?? TIER_STYLES.bronze;
  const sizes = { sm: "size-10 [&_svg]:size-4", md: "size-14 [&_svg]:size-6", lg: "size-20 [&_svg]:size-9" };

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-3xl bg-gradient-to-br ring-2",
        sizes[size],
        locked ? "bg-muted text-muted-foreground ring-border grayscale" : cn(tier.bg, tier.ring, tier.text, tier.glow),
      )}
    >
      <BadgeIcon name={badge.icon} />
    </span>
  );
}
