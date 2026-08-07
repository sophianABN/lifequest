import type { Metadata } from "next";
import { Columns3 } from "lucide-react";

import { getGoals } from "@/server/queries/goals";
import { PageHeader } from "@/components/shared/page-header";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export const metadata: Metadata = { title: "Kanban" };

export default async function KanbanPage() {
  const goals = await getGoals();

  return (
    <div>
      <PageHeader
        title="Kanban"
        icon={<Columns3 className="size-7 text-lilac-500" />}
        description="Glisse tes objectifs d'une colonne à l'autre. Passer une carte dans « Terminé » déclenche la célébration."
      />

      <KanbanBoard goals={goals} />
    </div>
  );
}
