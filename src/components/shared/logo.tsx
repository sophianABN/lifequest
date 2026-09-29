import * as React from "react";

import { cn } from "@/lib/utils";
import { APP } from "@/lib/constants";

/* ═══════════════════════════════════════════════════════════════════════════
   IDENTITÉ VISUELLE

   Le signe raconte la promesse : un point de départ, un chemin qui s'élève,
   une étoile au bout. « Transforme tes rêves en itinéraire. »

   L'étoile à quatre branches est exactement celle de `Sparkle`, le motif déjà
   semé dans toute l'interface — le logo prolonge le décor au lieu d'introduire
   une forme étrangère.

   Le tracé est volontairement épais et l'étoile détachée du chemin : collés,
   les deux fusionnent en une baguette magique, et sous 20 px un trait fin
   disparaît complètement.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Rayon des coins, exprimé en pourcentage pour coïncider exactement avec le
 * `rx="17"` du SVG (17/64 ≈ 26,5 %). Une classe en unités fixes — `rounded-2xl`
 * et ses 16 px — rognerait par-dessus le tracé et arrondirait la pastille bien
 * au-delà, jusqu'à la rendre ronde aux petites tailles.
 */
export const MARK_RADIUS = "rounded-[26.5%]";

/**
 * Le signe seul, dans sa pastille.
 *
 * `title` le rend accessible ; sans lui le SVG est décoratif et sort de
 * l'arbre d'accessibilité — ce qu'on veut quand un texte l'accompagne déjà.
 */
export function LogoMark({
  size = 40,
  className,
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  // Un identifiant par instance : partagé, le dégradé est résolu sur la
  // première occurrence du document — celle de la sidebar desktop, masquée en
  // mobile (`display: none`), et le signe du tiroir de navigation sortait vide.
  const gradientId = `lifequest-brand-${React.useId()}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f295b6" />
          <stop offset="48%" stopColor="#a98ad4" />
          <stop offset="100%" stopColor="#45bcae" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="17" fill={`url(#${gradientId})`} />

      {/* Le chemin, et son point de départ */}
      <path
        d="M13.5 51 C 22 51 29.5 46 34.5 36.5"
        fill="none"
        stroke="#fff"
        strokeWidth="5.2"
        strokeLinecap="round"
      />
      <circle cx="13.5" cy="51" r="4" fill="#fff" />

      {/* L'étoile au bout — même tracé que `Sparkle` */}
      <g transform="translate(35 8) scale(0.95)" fill="#fff">
        <path d="M12 0c.6 5.6 5.8 10.8 11.4 11.4v1.2C17.8 13.2 12.6 18.4 12 24h-1.2C10.2 18.4 5 13.2-.6 12.6v-1.2C5 10.8 10.2 5.6 10.8 0Z" />
      </g>
    </svg>
  );
}

/** Signe + nom, la forme complète du logo. */
export function Logo({
  size = 40,
  className,
  subtitle,
}: {
  size?: number;
  className?: string;
  /** Ligne secondaire sous le nom — le titre de quête, par exemple. */
  subtitle?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} className={cn("shrink-0", MARK_RADIUS, "shadow-glow-blush")} />
      <span className="min-w-0">
        <span className="block font-display text-xl leading-none">{APP.name}</span>
        {subtitle && (
          <span className="block truncate text-[0.7rem] text-muted-foreground">{subtitle}</span>
        )}
      </span>
    </span>
  );
}
