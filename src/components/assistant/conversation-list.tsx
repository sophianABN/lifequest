"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquarePlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, relativeTime } from "@/lib/utils";
import { deleteConversation, renameConversation } from "@/server/actions/assistant";

export interface ConversationItem {
  id: string;
  title: string;
  updatedAt: Date;
  preview: string | null;
}

/**
 * Liste des conversations passées.
 *
 * La conversation active est portée par l'URL (`?c=<id>`) plutôt que par un
 * état local : le lien est partageable, le bouton « retour » fonctionne, et le
 * serveur peut recharger les messages sans aller-retour supplémentaire.
 */
export function ConversationList({
  conversations,
  activeId,
  onNavigate,
}: {
  conversations: ConversationItem[];
  activeId?: string;
  /** Appelé après un clic — sert à refermer le tiroir sur mobile. */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = React.useState<ConversationItem | null>(null);
  const [title, setTitle] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  /**
   * Ouverture différée d'un cran : en fermant, le menu Radix restaure le focus
   * et lève son `pointer-events: none`. Une boîte de dialogue montée dans le
   * même tick est aussitôt considérée comme cliquée « à l'extérieur » et se
   * referme — d'où le report au macrotask suivant.
   */
  function openRename(conversation: ConversationItem) {
    setTimeout(() => {
      setRenaming(conversation);
      setTitle(conversation.title);
    }, 0);
  }

  function submitRename(event: React.FormEvent) {
    event.preventDefault();
    if (!renaming) return;
    const id = renaming.id;
    startTransition(async () => {
      const result = await renameConversation({ id, title });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setRenaming(null);
      router.refresh();
    });
  }

  function remove(conversation: ConversationItem) {
    startTransition(async () => {
      await deleteConversation(conversation.id);
      toast.success("Conversation supprimée");
      // On quitte la conversation supprimée, sinon l'écran resterait sur une
      // URL qui ne pointe plus sur rien.
      if (conversation.id === activeId) router.push("/assistant");
      else router.refresh();
    });
  }

  return (
    <>
      <div className="flex h-full flex-col gap-3">
        <Button asChild variant="outline" className="w-full justify-start gap-2">
          <Link href="/assistant" onClick={onNavigate}>
            <MessageSquarePlus className="size-4" />
            Nouvelle conversation
          </Link>
        </Button>

        {conversations.length === 0 ? (
          <p className="px-1 text-xs text-muted-foreground">
            Tes conversations s&apos;enregistreront ici automatiquement.
          </p>
        ) : (
          <ul className="-mr-1 flex-1 space-y-1 overflow-y-auto pr-1">
            {conversations.map((conversation) => {
              const active = conversation.id === activeId;
              return (
                <li key={conversation.id} className="group/item relative">
                  <Link
                    href={`/assistant?c=${conversation.id}`}
                    onClick={onNavigate}
                    className={cn(
                      "block rounded-2xl border border-transparent py-2 pl-3 pr-9 transition-colors",
                      active
                        ? "border-blush-200 bg-blush-50 dark:border-blush-800 dark:bg-blush-900/25"
                        : "hover:bg-muted/60",
                    )}
                  >
                    <p className="truncate text-sm font-medium">{conversation.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {conversation.preview ?? relativeTime(conversation.updatedAt)}
                    </p>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        // Toujours visible au clavier et au toucher ; discret à la souris.
                        className="absolute right-1 top-1.5 size-7 opacity-0 focus-visible:opacity-100 group-hover/item:opacity-100 max-md:opacity-100"
                        aria-label={`Actions pour « ${conversation.title} »`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openRename(conversation)}>
                        <Pencil className="size-4" />
                        Renommer
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive onSelect={() => remove(conversation)}>
                        <Trash2 className="size-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent
          className="sm:max-w-md"
          // Radix pose le focus sur le panneau lui-même ; on le redirige vers
          // le champ, et on sélectionne le titre pour pouvoir le remplacer
          // directement en tapant.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
            inputRef.current?.select();
          }}
        >
          <form onSubmit={submitRename}>
            <DialogHeader>
              <DialogTitle>Renommer la conversation</DialogTitle>
              <DialogDescription>
                Un titre parlant t&apos;aidera à la retrouver dans quelques mois.
              </DialogDescription>
            </DialogHeader>

            <Input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="mt-4"
              aria-label="Titre de la conversation"
            />

            <DialogFooter className="mt-5">
              <Button type="button" variant="ghost" onClick={() => setRenaming(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending || !title.trim()}>
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
