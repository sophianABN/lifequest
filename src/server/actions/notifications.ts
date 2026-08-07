"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markNotificationRead(id: string) {
  const userId = await requireUserId();
  // Le `userId` dans le `where` garantit qu'on ne peut pas marquer la
  // notification de quelqu'un d'autre, même en devinant un identifiant.
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
}

export async function deleteNotification(id: string) {
  const userId = await requireUserId();
  await prisma.notification.deleteMany({ where: { id, userId } });
  revalidatePath("/", "layout");
}
