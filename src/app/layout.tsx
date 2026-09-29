import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces, Caveat } from "next/font/google";

import { Providers } from "@/providers";
import { APP } from "@/lib/constants";
import "./globals.css";

/* Trois familles, trois rôles :
   — Jakarta pour l'interface (géométrique, chaleureuse, très lisible)
   — Fraunces pour les titres (serif douce, apporte le côté artistique)
   — Caveat pour les annotations manuscrites (doodles, citations) */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  /**
   * Sans cette base, Next préfixe `og:image` par `http://localhost:3000` et
   * tout aperçu de lien est cassé.
   *
   * Les métadonnées des pages statiques — `/connexion`, `/inscription`, celles
   * qu'on partage justement — sont figées à la construction. Lire `AUTH_URL`
   * ici ne servirait à rien : elle n'existe qu'à l'exécution. Le domaine
   * arrive donc par `NEXT_PUBLIC_SITE_URL`, passé en argument de build.
   */
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: `${APP.name} — ${APP.tagline}`, template: `%s · ${APP.name}` },
  description:
    "LifeQuest accompagne tes plus grands objectifs de vie sur plusieurs années : décomposition en étapes, priorisation intelligente, planning, journal et motivation quotidienne.",
  applicationName: APP.name,
  keywords: ["objectifs", "bucket list", "productivité", "coach", "habitudes"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfbf9" },
    { media: "(prefers-color-scheme: dark)", color: "#17131d" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Les variables de police sont posées sur <html> et non sur <body> : les
    // tokens `@theme` de Tailwind sont déclarés sur `:root` et doivent pouvoir
    // les résoudre au même niveau.
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${jakarta.variable} ${fraunces.variable} ${caveat.variable}`}
    >
      <body className="antialiased">
        <Providers>{children}</Providers>
        {/* Fond de la barre d'état dans l'application mobile : le contenu qui
            défile passe dessous, flouté comme sous la topbar, au lieu de se
            mêler à l'heure et à la batterie. Hauteur nulle dans un navigateur. */}
        <div aria-hidden className="glass fixed inset-x-0 top-0 z-40 h-[var(--safe-top)]" />
      </body>
    </html>
  );
}
