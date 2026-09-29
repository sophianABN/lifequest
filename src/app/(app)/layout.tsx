import { redirect } from "next/navigation";

import { getNotifications, getProfile } from "@/server/queries/user";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AuroraBackground } from "@/components/shared/decorations";
import { DemoBanner } from "@/components/shared/demo-banner";
import { isDemoSession } from "@/lib/auth";

/**
 * Coquille applicative : sidebar fixe en desktop, topbar collante, barre
 * d'onglets en bas sur mobile. Le profil et les notifications sont chargés
 * ici une seule fois et distribués aux composants clients.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, notifications, demo] = await Promise.all([
    getProfile(),
    getNotifications(),
    isDemoSession(),
  ]);
  if (!profile) redirect("/connexion");

  const sidebarUser = {
    name: profile.name,
    xp: profile.xp,
    streakCurrent: profile.streakCurrent,
    deadlineDate: profile.deadlineDate,
    questTitle: profile.questTitle,
  };

  return (
    // `--safe-top` / `--safe-bottom` valent 0 dans un navigateur : ces
    // décalages ne concernent que l'application mobile, où la page passe sous
    // la barre d'état et l'indicateur d'accueil.
    <div className="min-h-dvh pt-[var(--safe-top)]">
      <AuroraBackground />
      {demo && <DemoBanner />}

      <div className="mx-auto flex max-w-[110rem]">
        {/* Sidebar desktop */}
        <aside className="sticky top-[var(--safe-top)] hidden h-[calc(100dvh-var(--safe-top))] w-[17.5rem] shrink-0 border-r border-border/60 lg:block">
          <Sidebar user={sidebarUser} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            user={{ ...sidebarUser, email: profile.email, image: profile.image }}
            notifications={notifications}
          />

          <main className="flex-1 px-4 pb-[calc(6rem+var(--safe-bottom))] pt-6 sm:px-6 lg:px-8 lg:pb-10">
            {children}
          </main>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
