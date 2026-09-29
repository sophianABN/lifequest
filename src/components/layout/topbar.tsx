"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/dialog";
import { Sidebar, type SidebarUser } from "./sidebar";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";
import { NotificationsMenu, type NotificationItem } from "./notifications-menu";
import { UserMenu } from "./user-menu";

export function Topbar({
  user,
  notifications,
}: {
  user: SidebarUser & { email: string; image: string | null };
  notifications: NotificationItem[];
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    // Collée sous la barre d'état dans l'application mobile (`--safe-top`,
    // nul dans un navigateur).
    <header className="sticky top-[var(--safe-top)] z-30 flex h-16 items-center gap-2 border-b border-border/60 glass px-3 sm:px-5">
      {/* Navigation mobile en tiroir */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="px-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar user={user} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1">
        <CommandPalette />
      </div>

      <Button variant="ghost" size="icon" asChild aria-label="Assistant IA">
        <Link href="/assistant">
          <Sparkles />
        </Link>
      </Button>

      <ThemeToggle />
      <NotificationsMenu notifications={notifications} />

      <Button size="sm" asChild className="hidden sm:inline-flex">
        <Link href="/objectifs?nouveau=1">
          <Plus /> Objectif
        </Link>
      </Button>

      <UserMenu name={user.name} email={user.email} image={user.image} xp={user.xp} />
    </header>
  );
}
