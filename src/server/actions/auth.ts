"use server";

import { headers } from "next/headers";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

/**
 * Crée un compte. On provisionne immédiatement les catégories par défaut :
 * un nouvel utilisateur qui crée son premier objectif doit pouvoir le classer
 * sans passer par un écran de configuration.
 */
export async function registerUser(input: unknown) {
  // Un formulaire d'inscription ouvert est un point d'entrée à spam : on
  // plafonne la création de comptes par adresse IP.
  const ip = clientIp(await headers());
  if (!rateLimit(`register:${ip}`, 5, 60 * 60 * 1000).allowed) {
    return {
      ok: false as const,
      error: "Trop de comptes créés depuis cette connexion. Réessaie dans une heure.",
    };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false as const, error: "Un compte existe déjà avec cette adresse." };
  }

  const birthDate = parsed.data.birthDate ? new Date(parsed.data.birthDate) : null;
  // Échéance par défaut : le 25e anniversaire, cœur du concept de l'application.
  const deadlineDate = birthDate ? new Date(birthDate) : null;
  if (deadlineDate && birthDate) deadlineDate.setFullYear(birthDate.getFullYear() + 25);

  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      birthDate,
      deadlineDate,
      categories: {
        create: DEFAULT_CATEGORIES.map((c, i) => ({ ...c, order: i })),
      },
    },
  });

  return { ok: true as const };
}
