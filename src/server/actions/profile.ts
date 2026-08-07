"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validations/goal";

export async function updateProfile(input: unknown) {
  const userId = await requireUserId();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }
  const data = parsed.data;

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      bio: data.bio ?? null,
      image: data.image || null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      deadlineDate: data.deadlineDate ? new Date(data.deadlineDate) : null,
      questTitle: data.questTitle,
      city: data.city ?? null,
      country: data.country ?? null,
      schoolLevel: data.schoolLevel ?? null,
      freeHoursWeekly: data.freeHoursWeekly,
      monthlySavings: data.monthlySavings,
      availableBudget: data.availableBudget,
    },
  });

  // Le profil alimente le moteur d'intelligence : tous les scores changent.
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function addSkill(name: string, level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT") {
  const userId = await requireUserId();
  if (!name.trim()) return { ok: false as const };
  await prisma.skill.upsert({
    where: { userId_name: { userId, name: name.trim() } },
    create: { userId, name: name.trim(), level },
    update: { level },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteSkill(id: string) {
  const userId = await requireUserId();
  await prisma.skill.deleteMany({ where: { id, userId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function addLanguage(name: string, level: string) {
  const userId = await requireUserId();
  if (!name.trim()) return { ok: false as const };
  await prisma.language.upsert({
    where: { userId_name: { userId, name: name.trim() } },
    create: { userId, name: name.trim(), level },
    update: { level },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteLanguage(id: string) {
  const userId = await requireUserId();
  await prisma.language.deleteMany({ where: { id, userId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function addConstraint(label: string, until: string | null) {
  const userId = await requireUserId();
  if (!label.trim()) return { ok: false as const };
  await prisma.constraint.create({
    data: { userId, label: label.trim(), until: until ? new Date(until) : null },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteConstraint(id: string) {
  const userId = await requireUserId();
  await prisma.constraint.deleteMany({ where: { id, userId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function addPerson(name: string, role: string | null) {
  const userId = await requireUserId();
  if (!name.trim()) return { ok: false as const };
  await prisma.person.create({ data: { userId, name: name.trim(), role: role || null } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deletePerson(id: string) {
  const userId = await requireUserId();
  await prisma.person.deleteMany({ where: { id, userId } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
