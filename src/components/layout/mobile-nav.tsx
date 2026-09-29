"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { haptic } from "@/lib/native";
import { MOBILE_NAV } from "./nav-config";

/** Barre d'onglets fixe en bas d'écran — remplace la sidebar sur mobile. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 glass pb-[var(--safe-bottom)] lg:hidden"
      aria-label="Navigation"
    >
      <ul className="flex items-stretch justify-around">
        {MOBILE_NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                // Léger déclic sous le doigt dans l'application, comme une
                // barre d'onglets native.
                onClick={() => void haptic("selection")}
                className={cn(
                  "relative flex min-w-0 flex-col items-center gap-0.5 px-1 py-2.5 text-[0.65rem] font-semibold transition-colors",
                  active ? "text-blush-600 dark:text-blush-300" : "text-muted-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-nav-active"
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-blush-400"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <item.icon className="size-5 shrink-0" />
                {/* Une seule ligne, quoi qu'il arrive : un libellé qui passe à
                    la ligne déborde de son onglet et chevauche le contenu. */}
                <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
