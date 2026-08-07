"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  Coins,
  FileText,
  ImageIcon,
  Link2,
  Lightbulb,
  Lock,
  Paperclip,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadButton } from "@/components/shared/file-upload";
import { READINESS_CONFIG } from "@/lib/constants";
import { cn, formatMoney } from "@/lib/utils";
import type { GoalAnalysis } from "@/lib/intelligence/types";
import { addAttachment, deleteAttachment, updateSavedAmount } from "@/server/actions/goals";

/* ═══════════════════════════════════════════════════════════════════════════
   COLONNE LATÉRALE DE LA FICHE OBJECTIF
   ═══════════════════════════════════════════════════════════════════════════ */

/** Analyse du moteur d'intelligence : faisabilité, blocages, prochaines actions. */
export function IntelligencePanel({ analysis }: { analysis: GoalAnalysis }) {
  const readiness = READINESS_CONFIG[analysis.readiness];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="size-4 text-gold-500" /> Analyse
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant={readiness.color}>
            {analysis.readiness === "LOCKED" && <Lock />}
            {readiness.label}
          </Badge>
          <span className="text-sm">
            Score <strong className="tabular-nums">{analysis.score}</strong>/100
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{readiness.hint}</p>

        {/* Décomposition du score — rend la recommandation vérifiable */}
        <details className="group">
          <summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground hover:text-foreground">
            <span className="group-open:hidden">Pourquoi ce score ? ▸</span>
            <span className="hidden group-open:inline">Masquer le détail ▾</span>
          </summary>
          <ul className="mt-2.5 space-y-2">
            {analysis.breakdown.map((b) => (
              <li key={b.label}>
                <div className="mb-1 flex justify-between text-[0.7rem] text-muted-foreground">
                  <span className="capitalize">{LABELS[b.label] ?? b.label}</span>
                  <span className="tabular-nums">
                    {b.value}/100 · poids {Math.round(b.weight * 100)} %
                  </span>
                </div>
                <Progress value={b.value} size="sm" />
              </li>
            ))}
          </ul>
        </details>

        {analysis.blockers.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <AlertTriangle className="size-3.5" /> Ce qui bloque
            </p>
            <ul className="space-y-1.5">
              {analysis.blockers.map((b, i) => (
                <li
                  key={i}
                  className={cn(
                    "rounded-xl px-3 py-2 text-xs",
                    b.hard
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {b.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.nextActions.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Prochaines actions conseillées
            </p>
            <ul className="space-y-2">
              {analysis.nextActions.map((a, i) => (
                <li key={i} className="rounded-xl bg-aqua-100/60 px-3 py-2 dark:bg-aqua-900/25">
                  <p className="text-sm font-semibold">{a.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const LABELS: Record<string, string> = {
  urgency: "Urgence",
  budget: "Budget",
  time: "Temps disponible",
  momentum: "Élan",
  season: "Saison",
  priority: "Priorité déclarée",
};

/** Suivi de l'épargne dédiée à l'objectif. */
export function BudgetPanel({
  goalId,
  estimatedCost,
  savedAmount,
  monthsToAfford,
  monthlySavings,
}: {
  goalId: string;
  estimatedCost: number | null;
  savedAmount: number;
  monthsToAfford: number | null;
  monthlySavings: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = React.useState(String(savedAmount));
  const [pending, setPending] = React.useState(false);

  if (!estimatedCost) return null;

  const percent = Math.min(100, Math.round((savedAmount / estimatedCost) * 100));
  const missing = Math.max(0, estimatedCost - savedAmount);

  const save = async () => {
    setPending(true);
    const result = await updateSavedAmount(goalId, Number(amount));
    setPending(false);
    if (!result.ok) {
      toast.error("Montant invalide");
      return;
    }
    toast.success("Épargne mise à jour 💰");
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="size-4 text-gold-500" /> Budget
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-2xl">{formatMoney(savedAmount)}</span>
          <span className="text-sm text-muted-foreground">sur {formatMoney(estimatedCost)}</span>
        </div>
        <Progress value={percent} color="gold" />

        <p className="text-xs text-muted-foreground">
          {missing === 0 ? (
            <span className="font-semibold text-aqua-600 dark:text-aqua-300">Entièrement financé 🎉</span>
          ) : monthsToAfford != null ? (
            <>
              Il manque <strong>{formatMoney(missing)}</strong> — environ{" "}
              <strong>{monthsToAfford} mois</strong> à {formatMoney(monthlySavings)}/mois.
            </>
          ) : (
            <>
              Il manque <strong>{formatMoney(missing)}</strong>. Renseigne une capacité d&apos;épargne
              mensuelle dans les paramètres pour obtenir une date réaliste.
            </>
          )}
        </p>

        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9"
            aria-label="Montant épargné"
          />
          <Button size="sm" onClick={save} loading={pending}>
            Mettre à jour
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Personnes impliquées dans l'objectif. */
export function PeoplePanel({ people }: { people: { id: string; name: string; role: string | null }[] }) {
  if (people.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4 text-lilac-500" /> Avec
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {people.map((p) => (
          <span
            key={p.id}
            className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm"
            title={p.role ?? undefined}
          >
            <span className="grid size-6 place-items-center rounded-full bg-gradient-to-br from-blush-200 to-lilac-300 text-[0.65rem] font-bold text-blush-800">
              {p.name.slice(0, 2).toUpperCase()}
            </span>
            {p.name}
          </span>
        ))}
      </CardContent>
    </Card>
  );
}

/** Documents, photos et liens attachés. */
export function AttachmentsPanel({
  goalId,
  attachments,
  storageEnabled,
}: {
  goalId: string;
  attachments: { id: string; name: string; url: string; type: string }[];
  /** Un stockage objet est configuré : on propose alors un vrai téléversement. */
  storageEnabled: boolean;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [type, setType] = React.useState<"DOCUMENT" | "PHOTO" | "LINK">("LINK");

  const ICONS = { DOCUMENT: FileText, PHOTO: ImageIcon, LINK: Link2 };

  const save = async (payload: { name: string; url: string; type: typeof type }) => {
    const result = await addAttachment(goalId, payload);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    router.refresh();
    return true;
  };

  const add = async () => {
    if (!name.trim() || !url.trim()) {
      toast.error("Nom et lien requis");
      return;
    }
    if (await save({ name: name.trim(), url: url.trim(), type })) {
      setName("");
      setUrl("");
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="size-4 text-aqua-500" /> Documents
        </CardTitle>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Ajouter un document">
              <Plus />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-2.5">
            <p className="text-sm font-semibold">Ajouter une pièce jointe</p>

            {storageEnabled && (
              <>
                <FileUploadButton
                  scope="objectifs"
                  className="w-full"
                  label="Téléverser un fichier"
                  onUploaded={async (file) => {
                    // Le nom saisi prime, sinon celui du fichier d'origine.
                    await save({
                      name: name.trim() || file.name,
                      url: file.url,
                      type: file.contentType.startsWith("image/") ? "PHOTO" : "DOCUMENT",
                    });
                    setName("");
                  }}
                />
                <p className="text-center text-[0.7rem] text-muted-foreground">
                  ou renseigne un lien externe
                </p>
              </>
            )}

            <Input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
            <Input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} className="h-9" />
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LINK">Lien</SelectItem>
                <SelectItem value="DOCUMENT">Document</SelectItem>
                <SelectItem value="PHOTO">Photo</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="w-full" onClick={add}>
              Ajouter
            </Button>
          </PopoverContent>
        </Popover>
      </CardHeader>

      <CardContent>
        {attachments.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">
            Aucun document. Ajoute un devis, un billet, une inspiration…
          </p>
        ) : (
          <ul className="space-y-1">
            {attachments.map((a) => {
              const Icon = ICONS[a.type as keyof typeof ICONS] ?? Link2;
              return (
                <li key={a.id} className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <Link
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-sm hover:underline"
                  >
                    {a.name}
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={async () => {
                      await deleteAttachment(a.id);
                      router.refresh();
                    }}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
