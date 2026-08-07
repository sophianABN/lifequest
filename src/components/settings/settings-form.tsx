"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";
import type { Constraint, Language, Person, Skill, SkillLevel } from "@prisma/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileUploadButton, IMAGE_ACCEPT } from "@/components/shared/file-upload";
import { profileSchema, type ProfileInput } from "@/lib/validations/goal";
import {
  addConstraint,
  addLanguage,
  addPerson,
  addSkill,
  deleteConstraint,
  deleteLanguage,
  deletePerson,
  deleteSkill,
  updateProfile,
} from "@/server/actions/profile";
import { formatDate, initials } from "@/lib/utils";

const SKILL_LEVELS: Record<SkillLevel, string> = {
  BEGINNER: "Débutante",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancée",
  EXPERT: "Experte",
};

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];

/**
 * Paramètres du profil.
 *
 * Ces champs ne sont pas décoratifs : le temps libre, l'épargne mensuelle et
 * la date de naissance alimentent directement le moteur de priorisation.
 * Le formulaire le dit explicitement pour que l'utilisateur ait envie de les
 * remplir correctement.
 */
export function SettingsForm({
  initial,
  skills,
  languages,
  constraints,
  people,
  storageEnabled,
}: {
  initial: ProfileInput;
  skills: Skill[];
  languages: Language[];
  constraints: Constraint[];
  people: Person[];
  /** Un stockage objet est configuré : on propose alors un vrai téléversement. */
  storageEnabled: boolean;
}) {
  const router = useRouter();

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: initial,
  });

  const image = form.watch("image");

  const submit = async (values: ProfileInput) => {
    const result = await updateProfile(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Profil mis à jour — les priorités ont été recalculées ✨");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
        {/* Identité */}
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>Qui tu es, et jusqu&apos;à quand court ta quête.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Prénom</Label>
              <Input id="name" {...form.register("name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="questTitle">Titre de la quête</Label>
              <Input id="questTitle" {...form.register("questTitle")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Date de naissance</Label>
              <Input id="birthDate" type="date" {...form.register("birthDate")} />
              <p className="text-[0.7rem] text-muted-foreground">
                Sert à détecter les objectifs soumis à un âge minimum.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deadlineDate">Échéance de la quête</Label>
              <Input id="deadlineDate" type="date" {...form.register("deadlineDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" {...form.register("city")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Pays</Label>
              <Input id="country" {...form.register("country")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="image">Photo de profil</Label>
              <div className="flex items-center gap-3">
                <Avatar className="size-12 shrink-0">
                  {image && <AvatarImage src={image} alt="" />}
                  <AvatarFallback>{initials(form.watch("name") || "?")}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <Input id="image" placeholder="https://…" {...form.register("image")} />
                  {storageEnabled && (
                    <div className="flex items-center gap-2">
                      <FileUploadButton
                        scope="avatars"
                        accept={IMAGE_ACCEPT}
                        label="Choisir une image"
                        // Le champ est mis à jour, mais rien n'est écrit tant
                        // que le formulaire n'est pas enregistré.
                        onUploaded={(file) =>
                          form.setValue("image", file.url, { shouldDirty: true })
                        }
                      />
                      {image && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => form.setValue("image", "", { shouldDirty: true })}
                        >
                          Retirer
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" rows={2} {...form.register("bio")} />
            </div>
          </CardContent>
        </Card>

        {/* Moteur d'intelligence */}
        <Card variant="gradient">
          <CardHeader>
            <CardTitle>Ce qui alimente les recommandations</CardTitle>
            <CardDescription>
              Ces trois chiffres déterminent quels objectifs te sont proposés en priorité et à
              quelle échéance ils deviennent réalisables.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="freeHoursWeekly">Temps libre (h/semaine)</Label>
              <Input id="freeHoursWeekly" type="number" min={0} max={120} {...form.register("freeHoursWeekly")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monthlySavings">Épargne mensuelle (€)</Label>
              <Input id="monthlySavings" type="number" min={0} {...form.register("monthlySavings")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="availableBudget">Budget disponible (€)</Label>
              <Input id="availableBudget" type="number" min={0} {...form.register("availableBudget")} />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="schoolLevel">Niveau scolaire / situation</Label>
              <Input id="schoolLevel" placeholder="Licence 3 — Mathématiques" {...form.register("schoolLevel")} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" loading={form.formState.isSubmitting}>
          <Save /> Enregistrer le profil
        </Button>
      </form>

      {/* Listes annexes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChipList
          title="Compétences"
          description="Une compétence acquise débloque des objectifs qui en dépendent."
          items={skills.map((s) => ({ id: s.id, label: s.name, meta: SKILL_LEVELS[s.level] }))}
          onDelete={deleteSkill}
          fields={[
            { key: "name", placeholder: "Boxe anglaise" },
            {
              key: "level",
              type: "select",
              options: Object.entries(SKILL_LEVELS).map(([value, label]) => ({ value, label })),
            },
          ]}
          onAdd={async (values) =>
            addSkill(values.name, (values.level as SkillLevel) || "BEGINNER")
          }
        />

        <ChipList
          title="Langues"
          description="Niveau CECRL — utilisé pour les objectifs à l'étranger."
          items={languages.map((l) => ({ id: l.id, label: l.name, meta: l.level }))}
          onDelete={deleteLanguage}
          fields={[
            { key: "name", placeholder: "Allemand" },
            { key: "level", type: "select", options: CEFR.map((v) => ({ value: v, label: v })) },
          ]}
          onAdd={async (values) => addLanguage(values.name, values.level || "A1")}
        />

        <ChipList
          title="Contraintes"
          description="Ce qui limite ton action, et jusqu'à quand."
          items={constraints.map((c) => ({
            id: c.id,
            label: c.label,
            meta: c.until ? `jusqu'au ${formatDate(c.until)}` : "sans fin",
          }))}
          onDelete={deleteConstraint}
          fields={[
            { key: "label", placeholder: "Cours en semaine" },
            { key: "until", type: "date" },
          ]}
          onAdd={async (values) => addConstraint(values.label, values.until || null)}
        />

        <ChipList
          title="Personnes"
          description="Celles qui comptent dans tes objectifs."
          items={people.map((p) => ({ id: p.id, label: p.name, meta: p.role ?? undefined }))}
          onDelete={deletePerson}
          fields={[
            { key: "name", placeholder: "Aboud" },
            { key: "role", placeholder: "Meilleur ami" },
          ]}
          onAdd={async (values) => addPerson(values.name, values.role || null)}
        />
      </div>
    </div>
  );
}

/** Liste éditable générique : ajout par formulaire court, suppression au survol. */
function ChipList({
  title,
  description,
  items,
  fields,
  onAdd,
  onDelete,
}: {
  title: string;
  description: string;
  items: { id: string; label: string; meta?: string }[];
  fields: {
    key: string;
    placeholder?: string;
    type?: "text" | "date" | "select";
    options?: { value: string; label: string }[];
  }[];
  onAdd: (values: Record<string, string>) => Promise<{ ok: boolean }>;
  onDelete: (id: string) => Promise<{ ok: boolean }>;
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    const result = await onAdd(values);
    setPending(false);
    if (!result.ok) {
      toast.error("Champ requis manquant");
      return;
    }
    setValues({});
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Badge variant="muted" className="group gap-1.5 py-1 pr-1">
                {item.label}
                {item.meta && <span className="font-normal opacity-70">· {item.meta}</span>}
                <button
                  type="button"
                  aria-label={`Supprimer ${item.label}`}
                  onClick={async () => {
                    await onDelete(item.id);
                    router.refresh();
                  }}
                  className="rounded-full p-0.5 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-muted-foreground">Rien pour l&apos;instant.</li>}
        </ul>

        <form onSubmit={submit} className="flex flex-wrap gap-2">
          {fields.map((field) =>
            field.type === "select" ? (
              <Select
                key={field.key}
                value={values[field.key] ?? ""}
                onValueChange={(v) => setValues((s) => ({ ...s, [field.key]: v }))}
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue placeholder="Niveau" />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                key={field.key}
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((s) => ({ ...s, [field.key]: e.target.value }))}
                className="h-9 w-auto min-w-32 flex-1"
              />
            ),
          )}
          <Button type="submit" variant="soft" size="icon" loading={pending} aria-label="Ajouter">
            <Plus />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
