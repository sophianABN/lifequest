import { prisma } from "@/lib/prisma";
import { buildStepTree, computeProgress } from "@/lib/progress";

/**
 * Recalcule et persiste `Goal.progress`.
 *
 * Appelé après toute mutation d'étape ou de checklist. La valeur est
 * dénormalisée parce que le tableau de bord, le Kanban, la timeline et les
 * analytics lisent la progression de dizaines d'objectifs à la fois : la
 * recalculer en SQL à chaque rendu serait le goulot d'étranglement principal.
 */
export async function recomputeGoalProgress(goalId: string) {
  const [goal, steps, checklist] = await Promise.all([
    prisma.goal.findUnique({ where: { id: goalId }, select: { status: true } }),
    prisma.step.findMany({
      where: { goalId },
      select: { id: true, parentId: true, order: true, done: true },
    }),
    prisma.checklistItem.findMany({ where: { goalId }, select: { done: true } }),
  ]);
  if (!goal) return 0;

  const tree = buildStepTree(steps);
  const progress = computeProgress(tree, checklist, goal.status === "DONE");

  await prisma.goal.update({ where: { id: goalId }, data: { progress } });
  return progress;
}

/**
 * Marque un objectif terminé (ou le rouvre) en gardant `progress`,
 * `completedAt` et le statut cohérents entre eux.
 */
export async function setGoalCompletion(goalId: string, done: boolean) {
  await prisma.goal.update({
    where: { id: goalId },
    data: {
      status: done ? "DONE" : "IN_PROGRESS",
      completedAt: done ? new Date() : null,
      progress: done ? 100 : undefined,
    },
  });
  if (!done) await recomputeGoalProgress(goalId);
}
