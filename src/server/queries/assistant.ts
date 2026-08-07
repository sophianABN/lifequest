import { cache } from "react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Nombre de conversations chargées dans la liste latérale. */
const CONVERSATION_LIMIT = 60;

/**
 * Fenêtre d'historique renvoyée au modèle.
 *
 * On tronque volontairement : le prompt système contient déjà tout l'état des
 * objectifs, et une conversation de cinquante tours n'améliore pas la réponse
 * — elle coûte juste des jetons.
 */
export const HISTORY_WINDOW = 20;

/**
 * Aperçu d'une réponse : le Markdown y est du bruit visuel sur une ligne
 * tronquée. On retire la syntaxe plutôt que de la rendre.
 */
function plainPreview(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*(?:#{1,6}\s+|[-*]\s+|\d+\.\s+|>\s?)/gm, "")
    .replace(/^\s*(?:---+|\*\*\*+)\s*$/gm, " ")
    .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: Date;
  preview: string | null;
}

/** Liste des conversations de l'utilisateur, la plus récente en tête. */
export const getConversations = cache(async (): Promise<ConversationSummary[]> => {
  const session = await auth();
  if (!session?.user?.id) return [];

  const rows = await prisma.aiConversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: CONVERSATION_LIMIT,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      messages: {
        where: { role: "ASSISTANT" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt,
    preview: c.messages[0] ? plainPreview(c.messages[0].content) : null,
  }));
});

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/**
 * Messages d'une conversation. Renvoie `null` si elle n'existe pas ou
 * n'appartient pas à l'utilisateur — les deux cas se traitent pareil côté
 * interface (on repart d'une conversation vierge).
 */
export const getConversationMessages = cache(
  async (conversationId: string): Promise<StoredMessage[] | null> => {
    const session = await auth();
    if (!session?.user?.id) return null;

    const conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
      select: {
        messages: {
          // Les messages SYSTEM ne sont jamais persistés, mais on filtre quand
          // même : le prompt système ne doit pas fuir dans l'interface.
          where: { role: { in: ["USER", "ASSISTANT"] } },
          orderBy: { createdAt: "asc" },
          select: { id: true, role: true, content: true },
        },
      },
    });
    if (!conversation) return null;

    return conversation.messages.map((m) => ({
      id: m.id,
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));
  },
);
