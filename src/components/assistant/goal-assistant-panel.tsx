"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarRange, Coins, ListPlus, Loader2, MessageCircleQuestion, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { createStepsBulk } from "@/server/actions/steps";

interface GeneratedStep {
  title: string;
  description?: string;
  estimatedMinutes?: number;
  offsetDays?: number;
}

interface BudgetPlan {
  cost: number;
  saved: number;
  missing: number;
  requiredMonthly: number | null;
  monthsAtCurrentRate: number | null;
  advice: string;
}

/**
 * Assistant contextuel de la fiche objectif.
 *
 * Les étapes générées ne sont **jamais** insérées automatiquement : elles sont
 * proposées, l'utilisateur décoche ce qui ne lui convient pas, puis valide.
 * Une IA qui écrit directement en base sans confirmation détruit la confiance.
 */
export function GoalAssistantPanel({
  goalId,
  goalTitle,
  hasSteps,
}: {
  goalId: string;
  goalTitle: string;
  hasSteps: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<string | null>(null);
  const [steps, setSteps] = React.useState<GeneratedStep[] | null>(null);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [budget, setBudget] = React.useState<BudgetPlan | null>(null);
  const [mode, setMode] = React.useState<"ai" | "engine" | null>(null);

  const call = async (kind: "steps" | "budget") => {
    setLoading(kind);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, goalId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMode(data.mode);
      if (kind === "steps") {
        setSteps(data.steps);
        setSelected(new Set(data.steps.map((_: unknown, i: number) => i)));
      } else {
        setBudget(data.budget);
      }
    } catch {
      toast.error("L'assistant n'a pas pu répondre. Réessaie dans un instant.");
    } finally {
      setLoading(null);
    }
  };

  const insertSteps = async () => {
    if (!steps) return;
    const chosen = steps.filter((_, i) => selected.has(i));
    if (chosen.length === 0) return;

    setLoading("insert");
    const result = await createStepsBulk(
      goalId,
      chosen.map((s) => ({
        title: s.title,
        description: s.description,
        estimatedMinutes: s.estimatedMinutes,
        dueDate:
          s.offsetDays != null
            ? new Date(Date.now() + s.offsetDays * 86_400_000).toISOString()
            : null,
      })),
    );
    setLoading(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${chosen.length} étapes ajoutées ✨`);
    setSteps(null);
    router.refresh();
  };

  return (
    <Card variant="gradient">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-blush-500" /> Assistant
          {mode === "engine" && (
            <Badge variant="muted" className="ml-auto">
              mode hors-ligne
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid gap-2">
          <Button
            variant="soft"
            size="sm"
            className="justify-start"
            loading={loading === "steps"}
            onClick={() => call("steps")}
          >
            <ListPlus /> {hasSteps ? "Proposer d'autres étapes" : "Générer les étapes"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            loading={loading === "budget"}
            onClick={() => call("budget")}
          >
            <Coins /> Analyser le budget
          </Button>
          <Button variant="ghost" size="sm" className="justify-start" asChild>
            <Link href={`/assistant?goal=${goalId}`}>
              <MessageCircleQuestion /> Poser une question
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="justify-start" asChild>
            <Link href="/assistant?action=planning">
              <CalendarRange /> Générer un planning
            </Link>
          </Button>
        </div>

        {/* Budget analysé */}
        {budget && (
          <div className="rounded-2xl bg-muted/60 p-3.5 text-sm">
            <p className="font-semibold">
              {formatMoney(budget.saved)} / {formatMoney(budget.cost)}
            </p>
            <p className="mt-1 text-muted-foreground">{budget.advice}</p>
          </div>
        )}

        {/* Étapes proposées */}
        {steps && (
          <div className="rounded-2xl border border-border bg-card p-3.5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Étapes proposées pour « {goalTitle} »
            </p>

            <ul className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Checkbox
                    checked={selected.has(i)}
                    onCheckedChange={(checked) =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(i);
                        else next.delete(i);
                        return next;
                      })
                    }
                    className="mt-0.5 size-4"
                    aria-label={step.title}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{step.title}</p>
                    {step.description && (
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    )}
                    {step.offsetDays != null && (
                      <p className="text-[0.7rem] text-muted-foreground">
                        dans {step.offsetDays} jours
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={insertSteps} loading={loading === "insert"}>
                Ajouter {selected.size} étape{selected.size > 1 ? "s" : ""}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSteps(null)}>
                Ignorer
              </Button>
            </div>
          </div>
        )}

        {loading && !steps && !budget && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> L&apos;assistant réfléchit…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
