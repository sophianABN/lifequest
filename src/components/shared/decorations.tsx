import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════
   DÉCORS
   Petites étoiles, doodles et fonds diffus. Purement visuels : tous ces
   éléments sont `aria-hidden` et n'entrent jamais dans l'ordre de tabulation.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Étoile à quatre branches — le motif signature de LifeQuest. */
export function Sparkle({
  className,
  size = 16,
  style,
}: {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
      style={style}
    >
      <path d="M12 0c.6 5.6 5.8 10.8 11.4 11.4v1.2C17.8 13.2 12.6 18.4 12 24h-1.2C10.2 18.4 5 13.2-.6 12.6v-1.2C5 10.8 10.2 5.6 10.8 0Z" />
    </svg>
  );
}

/** Semis d'étoiles scintillantes, réparties de façon déterministe. */
export function StarField({ count = 14, className }: { count?: number; className?: string }) {
  // Positions figées : un Math.random() provoquerait un écart d'hydratation.
  const stars = Array.from({ length: count }, (_, i) => ({
    top: `${(i * 37) % 95}%`,
    left: `${(i * 61) % 96}%`,
    size: 6 + ((i * 7) % 12),
    delay: `${(i % 6) * 0.4}s`,
    opacity: 0.2 + ((i % 5) * 0.12),
  }));

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {stars.map((s, i) => (
        <Sparkle
          key={i}
          size={s.size}
          className="absolute text-blush-300 animate-twinkle dark:text-lilac-300"
          style={{ top: s.top, left: s.left, animationDelay: s.delay, opacity: s.opacity }}
        />
      ))}
    </div>
  );
}

/** Halo diffus derrière les sections héros. */
export function GlowBlob({
  className,
  color = "blush",
}: {
  className?: string;
  color?: "blush" | "lilac" | "aqua" | "gold";
}) {
  const colors = {
    blush: "bg-blush-300/40",
    lilac: "bg-lilac-300/40",
    aqua: "bg-aqua-300/40",
    gold: "bg-gold-300/40",
  };
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute rounded-full blur-3xl", colors[color], className)}
    />
  );
}

/* ─── Doodles ──────────────────────────────────────────────────────────────
   Illustrations au trait, dessinées à la main en SVG. Elles utilisent
   `currentColor` pour s'adapter au thème clair/sombre.                     */

export function DoodleArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" fill="none" aria-hidden className={cn("w-24", className)}>
      <path
        d="M4 44c22-30 52-40 96-34"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="1 7"
      />
      <path d="M86 2c6 3 11 5 14 8-4 3-7 7-9 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DoodleUnderline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 14" fill="none" aria-hidden className={cn("w-full", className)}>
      <path
        d="M3 9c34-6 74-8 116-5 26 2 48 4 78 2"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DoodleHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 30" fill="none" aria-hidden className={cn("w-6", className)}>
      <path
        d="M16 27S2 18.6 2 10.2C2 5.7 5.6 2 10 2c2.6 0 4.9 1.3 6 3.3C17.1 3.3 19.4 2 22 2c4.4 0 8 3.7 8 8.2C30 18.6 16 27 16 27Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoodleMountain({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 70" fill="none" aria-hidden className={cn("w-28", className)}>
      <path d="M4 62 38 16l22 28 14-16 38 34H4Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M30 30h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="96" cy="16" r="7" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

export function DoodleConfetti({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 60" fill="none" aria-hidden className={cn("w-24", className)}>
      <path d="M12 48 34 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 48c10-2 20-2 28 2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="62" cy="18" r="3" fill="currentColor" />
      <circle cx="78" cy="34" r="2.4" fill="currentColor" />
      <circle cx="52" cy="40" r="2" fill="currentColor" />
      <path d="M70 8v6M86 20h6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Fond général de l'application : dégradés diffus + grain léger. */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-background">
      <div className="absolute inset-0 bg-aurora" />
      <div
        className="absolute inset-0 opacity-[0.15] mix-blend-overlay dark:opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
