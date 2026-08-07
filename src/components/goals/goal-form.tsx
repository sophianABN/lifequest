"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Category, Person } from "@prisma/client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider, Switch } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { COLOR_CLASSES, DIFFICULTY_LABELS, GOAL_COLORS, PRIORITY_CONFIG, STATUS_CONFIG } from "@/lib/constants";
import { goalSchema, type GoalInput } from "@/lib/validations/goal";
import { createGoal, updateGoal } from "@/server/actions/goals";

const EMOJIS = ["🎯", "✈️", "🥊", "🎓", "🛵", "🪂", "📸", "💛", "🚐", "🔓", "🇩🇪", "💇‍♀️", "🎤", "🦁", "🎖️", "🌍", "🏚️", "🚴‍♀️", "🚗", "➗", "📺", "🍓", "🎡", "🐉", "🎬"];

export interface GoalFormValues extends GoalInput {
  id?: string;
}

/**
 * Formulaire de création / édition d'objectif.
 *
 * Organisé en trois onglets : l'essentiel tient dans le premier, les champs de
 * planification et de contexte sont rangés derrière — un formulaire de 20
 * champs d'un seul tenant décourage la création.
 */
export function GoalFormDialog({
  open,
  onOpenChange,
  categories,
  people,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  people: Person[];
  initial?: GoalFormValues;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const form = useForm<GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: "",
      description: "",
      motivation: "",
      notes: "",
      emoji: "🎯",
      color: "blush",
      categoryId: null,
      status: "TODO",
      priority: "MEDIUM",
      difficulty: 3,
      targetDate: null,
      estimatedCost: null,
      savedAmount: 0,
      estimatedHours: null,
      country: "",
      city: "",
      minAge: null,
      isFavorit: false,
      personIds: [],
      ...initial,
    },
  });

  // Réinitialise le formulaire quand on ouvre l'édition d'un autre objectif.
  React.useEffect(() => {
    if (open && initial) form.reset({ ...form.getValues(), ...initial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  const submit = async (values: GoalInput) => {
    const result = isEdit ? await updateGoal(initial!.id!, values) : await createGoal(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Objectif mis à jour ✨" : "Objectif créé ✨");
    onOpenChange(false);
    form.reset();
    router.refresh();
    if (!isEdit && result.slug) router.push(`/objectifs/${result.slug}`);
  };

  const color = form.watch("color") ?? "blush";
  const difficulty = form.watch("difficulty") ?? 3;
  const selectedPeople = form.watch("personIds") ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'objectif" : "Nouvel objectif"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ajuste les informations : le moteur recalculera la priorité."
              : "Décris ton rêve. Tu pourras le découper en étapes juste après."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(submit)}>
          <Tabs defaultValue="essentiel">
            <TabsList className="w-full">
              <TabsTrigger value="essentiel" className="flex-1">L&apos;essentiel</TabsTrigger>
              <TabsTrigger value="planning" className="flex-1">Planification</TabsTrigger>
              <TabsTrigger value="contexte" className="flex-1">Contexte</TabsTrigger>
            </TabsList>

            {/* ── Essentiel ─────────────────────────────────────────────── */}
            <TabsContent value="essentiel" className="space-y-4">
              <div className="flex gap-3">
                <div className="space-y-1.5">
                  <Label>Emoji</Label>
                  <Select
                    value={form.watch("emoji") ?? "🎯"}
                    onValueChange={(v) => form.setValue("emoji", v)}
                  >
                    <SelectTrigger className="w-20 text-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMOJIS.map((e) => (
                        <SelectItem key={e} value={e} className="text-lg">
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="title">Titre</Label>
                  <Input id="title" placeholder="Camp de boxe thaï en Thaïlande" {...form.register("title")} />
                  {form.formState.errors.title && (
                    <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Ce que tu veux vivre exactement…"
                  {...form.register("description")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="motivation">Pourquoi ça compte</Label>
                <Textarea
                  id="motivation"
                  rows={2}
                  placeholder="La phrase à relire les jours sans motivation."
                  {...form.register("motivation")}
                />
              </div>

              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="flex gap-2">
                  {GOAL_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => form.setValue("color", c)}
                      aria-label={c}
                      aria-pressed={color === c}
                      className={cn(
                        "size-8 rounded-xl transition-all",
                        COLOR_CLASSES[c].bg,
                        color === c ? "scale-110 ring-2 ring-offset-2 ring-offset-card " + COLOR_CLASSES[c].ring : "hover:scale-105",
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Catégorie</Label>
                  <Select
                    value={form.watch("categoryId") ?? "none"}
                    onValueChange={(v) => form.setValue("categoryId", v === "none" ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sans catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sans catégorie</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.emoji} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <Select
                    value={form.watch("status") ?? "TODO"}
                    onValueChange={(v) => form.setValue("status", v as GoalInput["status"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* ── Planification ─────────────────────────────────────────── */}
            <TabsContent value="planning" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="targetDate">Date cible</Label>
                  <Input id="targetDate" type="date" {...form.register("targetDate")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Priorité</Label>
                  <Select
                    value={form.watch("priority") ?? "MEDIUM"}
                    onValueChange={(v) => form.setValue("priority", v as GoalInput["priority"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Difficulté — {DIFFICULTY_LABELS[difficulty as number] ?? "Modéré"}
                </Label>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[difficulty as number]}
                  onValueChange={([v]) => form.setValue("difficulty", v)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="estimatedCost">Coût estimé (€)</Label>
                  <Input id="estimatedCost" type="number" min={0} placeholder="2800" {...form.register("estimatedCost")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="savedAmount">Déjà épargné (€)</Label>
                  <Input id="savedAmount" type="number" min={0} placeholder="950" {...form.register("savedAmount")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="estimatedHours">Temps estimé (h)</Label>
                  <Input id="estimatedHours" type="number" min={0} placeholder="320" {...form.register("estimatedHours")} />
                </div>
              </div>
            </TabsContent>

            {/* ── Contexte ──────────────────────────────────────────────── */}
            <TabsContent value="contexte" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="country">Pays</Label>
                  <Input id="country" placeholder="Thaïlande" {...form.register("country")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">Ville</Label>
                  <Input id="city" placeholder="Chiang Mai" {...form.register("city")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="minAge">Âge minimum</Label>
                  <Input id="minAge" type="number" min={0} max={99} placeholder="18" {...form.register("minAge")} />
                </div>
              </div>

              {people.length > 0 && (
                <div className="space-y-2">
                  <Label>Personnes impliquées</Label>
                  <div className="flex flex-wrap gap-2">
                    {people.map((p) => {
                      const active = selectedPeople.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            form.setValue(
                              "personIds",
                              active ? selectedPeople.filter((id) => id !== p.id) : [...selectedPeople, p.id],
                            )
                          }
                          className={cn(
                            "rounded-full border px-3 py-1 text-sm transition-colors",
                            active
                              ? "border-blush-300 bg-blush-100 text-blush-700 dark:bg-blush-900/40 dark:text-blush-200"
                              : "border-border text-muted-foreground hover:border-blush-300",
                          )}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes libres</Label>
                <Textarea id="notes" rows={4} placeholder="Liens, contacts, idées…" {...form.register("notes")} />
              </div>

              <label className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <span className="text-sm font-medium">Mettre en favori</span>
                <Switch
                  checked={form.watch("isFavorit") ?? false}
                  onCheckedChange={(v) => form.setValue("isFavorit", v)}
                />
              </label>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {isEdit ? "Enregistrer" : "Créer l'objectif"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
