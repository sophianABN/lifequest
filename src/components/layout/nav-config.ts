import {
  BarChart3,
  BookHeart,
  CalendarDays,
  Columns3,
  LayoutDashboard,
  Medal,
  Settings,
  Sparkles,
  Target,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Libellé court pour la barre d'onglets mobile, où chaque onglet fait un
   *  cinquième de l'écran — « Tableau de bord » y passe sur deux lignes. */
  shortLabel?: string;
  icon: LucideIcon;
  description: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/** Source unique de la navigation : sidebar, barre mobile et palette de commandes. */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Ma quête",
    items: [
      { href: "/", label: "Tableau de bord", shortLabel: "Accueil", icon: LayoutDashboard, description: "Vue d'ensemble et objectif du jour" },
      { href: "/objectifs", label: "Objectifs", icon: Target, description: "Les 25 objectifs et leurs étapes" },
      { href: "/kanban", label: "Kanban", icon: Columns3, description: "Organiser par statut" },
      { href: "/timeline", label: "Timeline", icon: Waypoints, description: "La frise de tes années" },
    ],
  },
  {
    label: "Organisation",
    items: [
      { href: "/calendrier", label: "Calendrier", icon: CalendarDays, description: "Jour, semaine, mois, année" },
      { href: "/journal", label: "Journal", icon: BookHeart, description: "Ce que tu as fait et appris" },
      { href: "/assistant", label: "Assistant", icon: Sparkles, description: "Ton coach personnel" },
    ],
  },
  {
    label: "Progression",
    items: [
      { href: "/analytics", label: "Statistiques", icon: BarChart3, description: "Chiffres, courbes et heatmap" },
      { href: "/badges", label: "Badges", icon: Medal, description: "Succès et récompenses" },
      { href: "/parametres", label: "Paramètres", icon: Settings, description: "Profil et préférences" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

/** Barre d'onglets mobile — on ne garde que les cinq destinations essentielles. */
export const MOBILE_NAV: NavItem[] = ["/", "/objectifs", "/calendrier", "/journal", "/assistant"]
  .map((href) => NAV_ITEMS.find((i) => i.href === href))
  .filter((i): i is NavItem => Boolean(i));
