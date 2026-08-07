import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProfile } from "@/server/queries/user";
import { getScorableGoals, getUserContext } from "@/server/queries/goals";
import { HISTORY_WINDOW } from "@/server/queries/assistant";
import {
  ANTHROPIC_MODEL,
  MISTRAL_MODEL,
  getAnthropic,
  getMistralKey,
  getProvider,
} from "@/lib/ai/client";
import { streamMistral } from "@/lib/ai/mistral";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { offlineAnswer } from "@/lib/ai/generators";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Titre déduit du premier message.
 *
 * Demander un titre au modèle coûterait un aller-retour supplémentaire pour un
 * gain discutable — et ne marcherait pas en mode hors-ligne.
 */
function titleFrom(message: string) {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length <= 60 ? clean : `${clean.slice(0, 57)}…`;
}

/**
 * Conversation avec l'assistant.
 *
 * Le client n'envoie que le nouveau message : l'historique fait autorité côté
 * serveur, il est relu depuis la base à chaque tour. Cela évite qu'un client
 * réécrive le passé de la conversation, et rend l'historique persistant sans
 * état supplémentaire dans l'interface.
 *
 * Trois chemins possibles, tous renvoyant du texte en streaming :
 *   1. Clé Mistral présente → Mistral, en flux.
 *   2. Clé Anthropic présente → Claude, en flux.
 *   3. Pas de clé, erreur réseau, ou refus du modèle → moteur déterministe.
 * L'utilisateur obtient toujours une réponse utile.
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("Non authentifié", { status: 401 });

  const body = (await request.json()) as {
    message?: string;
    conversationId?: string;
    goalId?: string;
  };
  const message = body.message?.trim();
  if (!message) return new Response("Message vide", { status: 400 });

  const [profile, goals, ctx] = await Promise.all([
    getProfile(),
    getScorableGoals(),
    getUserContext(),
  ]);
  if (!profile || !ctx) return new Response("Profil introuvable", { status: 400 });

  // ── Conversation ─────────────────────────────────────────────────────────
  // Un `conversationId` inconnu (supprimé dans un autre onglet, forgé) est
  // traité comme absent : on en ouvre une nouvelle plutôt que d'échouer.
  const existing = body.conversationId
    ? await prisma.aiConversation.findFirst({
        where: { id: body.conversationId, userId },
        select: { id: true, goalId: true },
      })
    : null;

  const conversation =
    existing ??
    (await prisma.aiConversation.create({
      data: { userId, title: titleFrom(message), goalId: body.goalId ?? null },
      select: { id: true, goalId: true },
    }));

  const history = existing
    ? (
        await prisma.aiMessage.findMany({
          where: { conversationId: conversation.id, role: { in: ["USER", "ASSISTANT"] } },
          orderBy: { createdAt: "desc" },
          take: HISTORY_WINDOW,
          select: { role: true, content: true },
        })
      )
        .reverse()
        .map<ChatMessage>((m) => ({
          role: m.role === "USER" ? "user" : "assistant",
          content: m.content,
        }))
    : [];

  await prisma.aiMessage.create({
    data: { conversationId: conversation.id, role: "USER", content: message },
  });

  const messages: ChatMessage[] = [...history, { role: "user", content: message }];
  const fallback = () => offlineAnswer(message, goals, ctx);

  /** Enregistre la réponse et fait remonter la conversation dans la liste. */
  async function persistAnswer(content: string) {
    if (!content.trim()) return;
    await prisma.$transaction([
      prisma.aiMessage.create({
        data: { conversationId: conversation.id, role: "ASSISTANT", content },
      }),
      prisma.aiConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      }),
    ]);
  }

  const encoder = new TextEncoder();
  const headers = (mode: "ai" | "offline") => ({
    "Content-Type": "text/plain; charset=utf-8",
    "X-Lifequest-Mode": mode,
    "X-Lifequest-Conversation": conversation.id,
  });

  /** Réponse hors-ligne : un seul fragment, mais persistée comme les autres. */
  async function offlineResponse() {
    const answer = fallback();
    await persistAnswer(answer);
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(answer));
          controller.close();
        },
      }),
      { headers: headers("offline") },
    );
  }

  const provider = getProvider();
  if (!provider) return offlineResponse();

  const system = buildSystemPrompt({
    name: profile.name,
    ctx,
    goals,
    focusGoalId: body.goalId ?? conversation.goalId ?? undefined,
  });

  // ── Mistral ──────────────────────────────────────────────────────────────
  if (provider === "mistral") {
    const apiKey = getMistralKey();
    if (!apiKey) return offlineResponse();

    const readable = new ReadableStream({
      async start(controller) {
        let answer = "";
        try {
          const chunks = streamMistral({
            apiKey,
            model: MISTRAL_MODEL,
            messages: [{ role: "system", content: system }, ...messages],
          });
          for await (const chunk of chunks) {
            answer += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
          // Réponse vide (refus, filtre) : on ne laisse pas l'écran blanc.
          if (!answer) {
            answer = fallback();
            controller.enqueue(encoder.encode(answer));
          }
        } catch {
          const rescue = answer
            ? `\n\n_(La connexion à l'assistant a été interrompue — voici ce que je peux te dire hors-ligne.)_\n\n${fallback()}`
            : fallback();
          answer += rescue;
          controller.enqueue(encoder.encode(rescue));
        } finally {
          await persistAnswer(answer);
          controller.close();
        }
      },
    });

    return new Response(readable, { headers: headers("ai") });
  }

  // ── Claude ───────────────────────────────────────────────────────────────
  const anthropic = getAnthropic();
  if (!anthropic) return offlineResponse();

  try {
    const stream = anthropic.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      // `low` suffit : les réponses sont courtes et le contexte est déjà
      // pré-mâché par le moteur d'intelligence.
      output_config: { effort: "low" },
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages,
    });

    const readable = new ReadableStream({
      async start(controller) {
        let answer = "";
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              answer += event.delta.text;
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          const final = await stream.finalMessage();
          // Le modèle peut décliner une demande : on bascule alors sur le
          // moteur local plutôt que de laisser l'utilisateur sans réponse.
          if (final.stop_reason === "refusal") {
            const rescue = fallback();
            answer += rescue;
            controller.enqueue(encoder.encode(rescue));
          }
        } catch {
          const rescue = `\n\n_(La connexion à l'assistant a été interrompue — voici ce que je peux te dire hors-ligne.)_\n\n${fallback()}`;
          answer += rescue;
          controller.enqueue(encoder.encode(rescue));
        } finally {
          await persistAnswer(answer);
          controller.close();
        }
      },
    });

    return new Response(readable, { headers: headers("ai") });
  } catch {
    return offlineResponse();
  }
}
