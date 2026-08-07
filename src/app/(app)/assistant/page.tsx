import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { getProfile } from "@/server/queries/user";
import { getConversationMessages, getConversations } from "@/server/queries/assistant";
import { isAiEnabled } from "@/lib/ai/client";
import { PageHeader } from "@/components/shared/page-header";
import { AssistantChat } from "@/components/assistant/chat";
import { Skeleton } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Assistant" };

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");

  const { c } = await searchParams;
  const [conversations, stored] = await Promise.all([
    getConversations(),
    c ? getConversationMessages(c) : Promise.resolve(null),
  ]);

  // Conversation supprimée ou n'appartenant pas à l'utilisateur : on repart
  // d'un fil vierge plutôt que d'afficher une erreur.
  const activeId = stored ? c : undefined;

  return (
    <div>
      <PageHeader
        title="Assistant"
        icon={<Sparkles className="size-7 text-blush-500" />}
        description="Il connaît tes objectifs, ton budget, ton temps libre et la saison. Demande-lui par où commencer."
      />

      <Suspense fallback={<Skeleton className="h-[32rem] w-full rounded-3xl" />}>
        <AssistantChat
          // Changer de conversation doit repartir d'un état propre.
          key={activeId ?? "nouvelle"}
          userName={profile.name}
          userImage={profile.image}
          aiEnabled={isAiEnabled()}
          conversations={conversations}
          conversationId={activeId}
          initialMessages={stored ?? []}
        />
      </Suspense>
    </div>
  );
}
