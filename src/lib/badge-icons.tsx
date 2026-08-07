import {
  Award,
  BookHeart,
  CalendarHeart,
  CheckCheck,
  Crown,
  Flame,
  Gem,
  Globe,
  Infinity as InfinityIcon,
  Library,
  ListChecks,
  Map,
  Medal,
  Moon,
  Mountain,
  PartyPopper,
  PenLine,
  PiggyBank,
  Plane,
  Sparkles,
  Star,
  Sunrise,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Registre explicite des icônes de badge.
 *
 * Les badges stockent un *nom* d'icône en base. Le résoudre via
 * `import * as Icons from "lucide-react"` marcherait, mais empêcherait le
 * tree-shaking : toute la bibliothèque (plus de mille icônes) partirait dans
 * le bundle client. Ce registre ne contient que les icônes réellement
 * utilisées.
 */
const BADGE_ICONS: Record<string, LucideIcon> = {
  Award,
  BookHeart,
  CalendarHeart,
  CheckCheck,
  Crown,
  Flame,
  Gem,
  Globe,
  Infinity: InfinityIcon,
  Library,
  ListChecks,
  Map,
  Medal,
  Moon,
  Mountain,
  PartyPopper,
  PenLine,
  PiggyBank,
  Plane,
  Sparkles,
  Star,
  Sunrise,
  TrendingUp,
  Trophy,
  Zap,
};

/**
 * Rend l'icône correspondant à un nom stocké en base.
 *
 * Exposé comme composant plutôt que comme fonction renvoyant un composant :
 * les appelants écrivent `<BadgeIcon name={…} />` au lieu de résoudre une
 * référence de composant pendant leur propre rendu.
 */
export function BadgeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = BADGE_ICONS[name] ?? Medal;
  return <Icon className={className} aria-hidden />;
}

export type { LucideIcon };
