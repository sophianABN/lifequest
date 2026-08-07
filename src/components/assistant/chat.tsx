"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowUp, History, Loader2, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/dialog";
import { Sparkle, StarField } from "@/components/shared/decorations";
import { cn, initials } from "@/lib/utils";
import { ConversationList, type ConversationItem } from "./conversation-list";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Que dois-je faire aujourd'hui ?",
  "Réorganise mes priorités",
  "Génère un planning pour cette semaine",
  "Qu'est-ce qui bloque mes objectifs ?",
  "Combien coûtent mes objectifs restants ?",
  "Quel objectif est le plus proche du but ?",
];

/**
 * Conversation avec l'assistant.
 *
 * La réponse arrive en flux de texte brut : pas de protocole d'événements à
 * maintenir des deux côtés, et le repli hors-ligne emprunte exactement le
 * même chemin.
 *
 * Le client n'envoie que le nouveau message — le serveur relit l'historique
 * depuis la base et le persiste. L'identifiant de la conversation revient dans
 * l'en-tête `X-Lifequest-Conversation`, ce qui permet d'accrocher l'URL à une
 * conversation fraîchement créée sans attendre un rechargement.
 */
export function AssistantChat({
  userName,
  userImage,
  aiEnabled,
  conversations,
  conversationId,
  initialMessages,
}: {
  userName: string;
  userImage: string | null;
  aiEnabled: boolean;
  conversations: ConversationItem[];
  conversationId?: string;
  initialMessages: Message[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goalId = searchParams.get("goal") ?? undefined;

  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  // Suit la conversation courante sans re-render : `send` doit lire la valeur
  // à jour même quand elle vient d'être créée au tour précédent.
  const currentId = React.useRef(conversationId);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Une action passée en paramètre d'URL lance directement la conversation.
  const sentInitial = React.useRef(false);
  React.useEffect(() => {
    if (sentInitial.current) return;
    const action = searchParams.get("action");
    if (action === "planning") {
      sentInitial.current = true;
      void send("Génère-moi un planning pour cette semaine.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    let createdId: string | null = null;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversationId: currentId.current, goalId }),
      });
      if (!res.ok || !res.body) throw new Error();

      const returnedId = res.headers.get("X-Lifequest-Conversation");
      if (returnedId && returnedId !== currentId.current) {
        createdId = returnedId;
        currentId.current = returnedId;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "Je n'ai pas réussi à répondre. Vérifie ta connexion et réessaie.",
        },
      ]);
    } finally {
      setStreaming(false);
      // Le serveur a fini d'écrire avant de fermer le flux : rafraîchir ici ne
      // peut pas lire un historique incomplet.
      if (createdId) {
        router.replace(`/assistant?c=${createdId}`, { scroll: false });
      } else {
        router.refresh();
      }
    }
  }

  const sidebar = (
    <ConversationList
      conversations={conversations}
      activeId={conversationId}
      onNavigate={() => setDrawerOpen(false)}
    />
  );

  return (
    <div className="grid h-[calc(100dvh-12rem)] gap-5 md:grid-cols-[15rem_1fr]">
      {/* Historique — colonne fixe à partir de md, tiroir en dessous */}
      <aside className="hidden min-h-0 md:block">{sidebar}</aside>

      <div className="flex min-h-0 flex-col gap-4">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2 md:hidden">
              <History className="size-4" />
              Historique
              {conversations.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {conversations.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-4">
            <SheetTitle className="mb-4">Historique</SheetTitle>
            {sidebar}
          </SheetContent>
        </Sheet>

        {/* Fil de conversation */}
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <Card variant="gradient" className="relative overflow-hidden p-8 text-center">
              <StarField count={12} />
              <div className="relative">
                <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-gradient-to-br from-blush-300 via-lilac-300 to-aqua-300 shadow-glow-blush">
                  <Sparkle size={26} className="text-white" />
                </span>
                <h2 className="mt-4 font-display text-2xl">Ton coach personnel</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Je connais tes objectifs, ton budget, ton temps libre et la saison. Demande-moi
                  par où commencer, ce qui bloque, ou de générer un plan.
                </p>

                {!aiEnabled && (
                  <Badge variant="muted" className="mt-4">
                    Mode hors-ligne — moteur déterministe (aucune clé API configurée)
                  </Badge>
                )}

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-sm transition-colors hover:border-blush-300 hover:bg-blush-50 dark:hover:bg-blush-900/20"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {messages.map((message, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}
            >
              {message.role === "assistant" ? (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blush-300 to-lilac-300 text-white">
                  <Sparkles className="size-4" />
                </span>
              ) : (
                <Avatar className="size-9 shrink-0">
                  {userImage && <AvatarImage src={userImage} alt="" />}
                  <AvatarFallback className="text-xs">{initials(userName)}</AvatarFallback>
                </Avatar>
              )}

              <div
                className={cn(
                  "max-w-[42rem] rounded-3xl px-4 py-3 text-sm",
                  message.role === "user"
                    ? "bg-gradient-to-br from-blush-400 to-blush-500 text-white"
                    : "border border-border/60 bg-card",
                )}
              >
                {message.content ? (
                  <Markdown content={message.content} />
                ) : (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </motion.div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Composeur */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2 rounded-3xl border border-border bg-card p-2 shadow-soft"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Comment réaliser ce rêve ? Que dois-je faire maintenant ?"
            rows={1}
            className="min-h-11 resize-none border-0 bg-transparent focus-visible:ring-0"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || streaming}
            aria-label="Envoyer"
          >
            {streaming ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </form>
      </div>
    </div>
  );
}

/**
 * Rendu Markdown minimal (titres, gras, italique, listes, liens, code).
 *
 * Une bibliothèque complète serait 40 ko de JS pour une dizaine de règles. En
 * revanche il faut couvrir ce que les modèles produisent réellement : titres
 * jusqu'à `####`, listes indentées, filets `---` et liens — sinon la syntaxe
 * s'affiche telle quelle au milieu de la réponse.
 */
function Markdown({ content }: { content: string }) {
  const html = React.useMemo(() => {
    // Les guillemets comptent autant que les chevrons : la règle des liens
    // injecte l'URL dans un attribut `href="…"`. Sans échappement, une réponse
    // contenant `[x](https://a"onfocus=alert(1))` sortirait de l'attribut.
    const escape = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    return (
      escape(content)
        // Titres — du plus long au plus court, sinon `####` serait capturé par `###`.
        .replace(/^#### (.*)$/gm, '<h4 class="font-display text-sm mt-3 mb-1">$1</h4>')
        .replace(/^### (.*)$/gm, '<h3 class="font-display text-base mt-3 mb-1">$1</h3>')
        .replace(/^## (.*)$/gm, '<h2 class="font-display text-lg mt-4 mb-1.5">$1</h2>')
        .replace(/^# (.*)$/gm, '<h2 class="font-display text-xl mt-4 mb-2">$1</h2>')
        .replace(/^\s*(?:---+|\*\*\*+)\s*$/gm, '<hr class="my-3 border-border" />')
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
        .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-[0.85em]">$1</code>')
        .replace(
          /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2">$1</a>',
        )
        // `[ \t]*` : les modèles indentent volontiers leurs sous-listes.
        .replace(/^[ \t]*[-*] (.*)$/gm, '<li class="ml-4 list-disc">$1</li>')
        .replace(/^[ \t]*\d+\. (.*)$/gm, '<li class="ml-4 list-decimal">$1</li>')
        .replace(/(<li[\s\S]*?<\/li>)(?!\s*<li)/g, '<ul class="my-1.5 space-y-0.5">$1</ul>')
        .replace(/\n{2,}/g, '</p><p class="mt-2">')
        .replace(/\n/g, "<br />")
    );
  }, [content]);

  return (
    <div
      className="[&_strong]:font-semibold [&_ul]:space-y-1"
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  );
}
