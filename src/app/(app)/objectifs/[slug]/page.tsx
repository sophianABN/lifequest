import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookHeart, ListTree } from "lucide-react";

import { getCategories, getGoalBySlug, getPeople, getScorableGoals, getUserContext } from "@/server/queries/goals";
import { getProfile } from "@/server/queries/user";
import { analyzeGoal } from "@/lib/intelligence/engine";
import { buildStepTree } from "@/lib/progress";
import { formatDate, toDateInput } from "@/lib/utils";
import { isStorageEnabled } from "@/lib/storage";
import { MOOD_CONFIG } from "@/lib/constants";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalDetailHeader } from "@/components/goals/goal-detail-header";
import { StepList, type StepNode } from "@/components/steps/step-list";
import { ChecklistPanel, CommentsPanel, DependenciesPanel } from "@/components/goals/goal-panels";
import { AttachmentsPanel, BudgetPanel, IntelligencePanel, PeoplePanel } from "@/components/goals/goal-sidebar";
import { GoalAssistantPanel } from "@/components/assistant/goal-assistant-panel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const goal = await getGoalBySlug(slug);
  return { title: goal?.title ?? "Objectif" };
}

export default async function GoalDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [goal, profile, categories, people, scorable, context] = await Promise.all([
    getGoalBySlug(slug),
    getProfile(),
    getCategories(),
    getPeople(),
    getScorableGoals(),
    getUserContext(),
  ]);

  if (!goal || !profile) notFound();

  const scorableGoal = scorable.find((g) => g.id === goal.id);
  const analysis = scorableGoal && context ? analyzeGoal(scorableGoal, context) : null;

  // Les étapes sont stockées à plat (`parentId`) et reconstruites en arbre ici.
  const stepTree = buildStepTree(goal.steps) as unknown as StepNode[];

  return (
    <div className="space-y-6">
      <GoalDetailHeader
        goal={goal}
        categories={categories}
        people={people}
        formValues={{
          id: goal.id,
          title: goal.title,
          description: goal.description ?? "",
          motivation: goal.motivation ?? "",
          notes: goal.notes ?? "",
          emoji: goal.emoji ?? "🎯",
          color: goal.color as never,
          categoryId: goal.categoryId,
          status: goal.status,
          priority: goal.priority,
          difficulty: goal.difficulty,
          targetDate: goal.targetDate ? toDateInput(goal.targetDate) : null,
          estimatedCost: goal.estimatedCost,
          savedAmount: goal.savedAmount,
          estimatedHours: goal.estimatedHours,
          country: goal.country ?? "",
          city: goal.city ?? "",
          minAge: goal.minAge,
          isFavorit: goal.isFavorit,
          personIds: goal.people.map((p) => p.personId),
        }}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTree className="size-4 text-blush-500" /> Étapes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StepList goalId={goal.id} steps={stepTree} />
            </CardContent>
          </Card>

          <ChecklistPanel goalId={goal.id} items={goal.checklist} />

          <DependenciesPanel
            dependsOn={goal.dependsOn.map((d) => d.prerequisite)}
            requiredFor={goal.requiredFor.map((d) => d.goal)}
          />

          {goal.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{goal.notes}</p>
              </CardContent>
            </Card>
          )}

          <CommentsPanel
            goalId={goal.id}
            comments={goal.comments}
            currentUser={{ name: profile.name, image: profile.image }}
          />
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          <GoalAssistantPanel
            goalId={goal.id}
            goalTitle={goal.title}
            hasSteps={goal.steps.length > 0}
          />

          {analysis && <IntelligencePanel analysis={analysis} />}

          <BudgetPanel
            goalId={goal.id}
            estimatedCost={goal.estimatedCost}
            savedAmount={goal.savedAmount}
            monthsToAfford={analysis?.monthsToAfford ?? null}
            monthlySavings={profile.monthlySavings}
          />

          <PeoplePanel people={goal.people.map((p) => p.person)} />

          <AttachmentsPanel
            goalId={goal.id}
            attachments={goal.attachments}
            storageEnabled={isStorageEnabled()}
          />

          {/* Journal lié à l'objectif */}
          {goal.journal.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookHeart className="size-4 text-lilac-500" /> Journal lié
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {goal.journal.map((entry) => (
                    <li key={entry.id} className="rounded-xl bg-muted/50 p-3">
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{MOOD_CONFIG[entry.mood].emoji}</span>
                        {formatDate(entry.date, "long")}
                      </p>
                      {entry.whatIDid && <p className="mt-1 text-sm">{entry.whatIDid}</p>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
