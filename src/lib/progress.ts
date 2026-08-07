/**
 * Calcul de la progression d'un objectif.
 *
 * Règle : seules les *feuilles* comptent. Une étape parente n'est qu'un
 * regroupement — la compter en plus de ses sous-étapes ferait sauter la barre
 * de progression de façon incohérente au moment de cocher le parent.
 * Les éléments de checklist comptent moitié moins qu'une étape : ce sont des
 * micro-tâches, pas des jalons.
 */

export interface ProgressStepNode {
  done: boolean;
  children?: ProgressStepNode[];
}

const CHECKLIST_WEIGHT = 0.5;
const STEP_WEIGHT = 1;

function walk(nodes: ProgressStepNode[], acc: { total: number; done: number }) {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      walk(node.children, acc);
    } else {
      acc.total += STEP_WEIGHT;
      if (node.done) acc.done += STEP_WEIGHT;
    }
  }
}

export function computeProgress(
  steps: ProgressStepNode[],
  checklist: { done: boolean }[] = [],
  fallbackDone = false,
): number {
  const acc = { total: 0, done: 0 };
  walk(steps, acc);

  for (const item of checklist) {
    acc.total += CHECKLIST_WEIGHT;
    if (item.done) acc.done += CHECKLIST_WEIGHT;
  }

  // Objectif sans aucune décomposition : c'est le statut qui fait foi.
  if (acc.total === 0) return fallbackDone ? 100 : 0;

  return Math.round((acc.done / acc.total) * 100);
}

/** Reconstruit l'arbre à partir d'une liste plate d'étapes (`parentId`). */
export function buildStepTree<T extends { id: string; parentId: string | null; order: number }>(
  flat: T[],
): (T & { children: (T & { children: T[] })[] })[] {
  const byParent = new Map<string | null, T[]>();
  for (const step of flat) {
    const list = byParent.get(step.parentId) ?? [];
    list.push(step);
    byParent.set(step.parentId, list);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.order - b.order);

  const attach = (node: T): never =>
    ({ ...node, children: (byParent.get(node.id) ?? []).map(attach) }) as never;

  return (byParent.get(null) ?? []).map(attach);
}
