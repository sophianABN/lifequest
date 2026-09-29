import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

import { getProfile } from "@/server/queries/user";
import { getPeople } from "@/server/queries/goals";
import { aiProviderLabel, isAiEnabled } from "@/lib/ai/client";
import { isDemoSession } from "@/lib/auth";
import { isStorageEnabled } from "@/lib/storage";
import { toDateInput } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { DeleteAccountCard } from "@/components/settings/delete-account";
import { DailyReminderCard } from "@/components/native/daily-reminder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const [profile, people, demo] = await Promise.all([getProfile(), getPeople(), isDemoSession()]);
  if (!profile) redirect("/connexion");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        icon={<Settings className="size-7 text-lilac-500" />}
        description="Ton profil pilote les recommandations. Plus il est précis, plus les conseils le sont."
      />

      <SettingsForm
        initial={{
          name: profile.name,
          bio: profile.bio ?? "",
          image: profile.image ?? "",
          birthDate: profile.birthDate ? toDateInput(profile.birthDate) : "",
          deadlineDate: profile.deadlineDate ? toDateInput(profile.deadlineDate) : "",
          questTitle: profile.questTitle,
          city: profile.city ?? "",
          country: profile.country ?? "",
          schoolLevel: profile.schoolLevel ?? "",
          freeHoursWeekly: profile.freeHoursWeekly,
          monthlySavings: profile.monthlySavings,
          availableBudget: profile.availableBudget,
        }}
        skills={profile.skills}
        languages={profile.languages}
        constraints={profile.constraints}
        people={people}
        storageEnabled={isStorageEnabled()}
      />

      {/* Application mobile uniquement — ne rend rien dans un navigateur. */}
      <DailyReminderCard />

      <Card>
        <CardHeader>
          <CardTitle>Assistant IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <Badge variant={isAiEnabled() ? "aqua" : "muted"}>
            {isAiEnabled() ? `Connecté à ${aiProviderLabel()}` : "Mode hors-ligne"}
          </Badge>
          <p>
            {isAiEnabled()
              ? `L'assistant utilise ${aiProviderLabel()} pour rédiger ses réponses et générer tes étapes.`
              : "Aucune clé API n'est configurée : l'assistant fonctionne avec son moteur déterministe. Toutes les fonctionnalités restent disponibles, seule la formulation est plus mécanique."}
          </p>
          <p className="text-xs">
            Pour activer l&apos;assistant, renseigne{" "}
            <code className="rounded bg-muted px-1">MISTRAL_API_KEY</code> (ou{" "}
            <code className="rounded bg-muted px-1">ANTHROPIC_API_KEY</code>) dans le fichier{" "}
            <code className="rounded bg-muted px-1">.env</code> puis redémarre le serveur.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stockage des fichiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <Badge variant={isStorageEnabled() ? "aqua" : "muted"}>
            {isStorageEnabled() ? "Stockage objet connecté" : "Liens externes uniquement"}
          </Badge>
          <p>
            {isStorageEnabled()
              ? "Tes photos et documents sont téléversés vers ton stockage privé. Ils ne sont lisibles que par toi, via une URL de l'application."
              : "Aucun stockage n'est configuré : les pièces jointes acceptent une URL externe, mais pas de fichier."}
          </p>
          <p className="text-xs">
            Pour l&apos;activer, renseigne <code className="rounded bg-muted px-1">S3_ENDPOINT</code>,{" "}
            <code className="rounded bg-muted px-1">S3_BUCKET</code>,{" "}
            <code className="rounded bg-muted px-1">S3_ACCESS_KEY_ID</code> et{" "}
            <code className="rounded bg-muted px-1">S3_SECRET_ACCESS_KEY</code> — MinIO, Cloudflare
            R2 ou tout service compatible S3.
          </p>
        </CardContent>
      </Card>

      <DeleteAccountCard demo={demo} />
    </div>
  );
}
