"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, Medal, Settings, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import { levelProgress } from "@/lib/gamification";

export function UserMenu({
  name,
  email,
  image,
  xp,
}: {
  name: string;
  email: string;
  image: string | null;
  xp: number;
}) {
  const level = levelProgress(xp);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full ring-offset-2 ring-offset-background transition-all hover:ring-2 hover:ring-blush-300"
          aria-label="Menu du compte"
        >
          <Avatar className="size-9 border-2 border-white shadow-soft dark:border-ink-800">
            {image && <AvatarImage src={image} alt="" />}
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="normal-case">
          <span className="block font-display text-sm text-foreground">{name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{email}</span>
          <span className="mt-1 block text-xs font-semibold text-gradient-brand">
            Niveau {level.level} · {level.title}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/parametres">
            <User /> Mon profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/badges">
            <Medal /> Mes badges
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/parametres">
            <Settings /> Paramètres
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onClick={() => void signOut({ callbackUrl: "/connexion" })}>
          <LogOut /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
