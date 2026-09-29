"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { haptic } from "@/lib/native";
import { deleteAccount } from "@/server/actions/account";

/**
 * Suppression définitive du compte.
 *
 * Placée en bas des paramètres, derrière une confirmation par mot de passe :
 * accessible sans chercher — les stores l'exigent —, impossible à déclencher
 * par mégarde.
 */
export function DeleteAccountCard({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const confirm = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount(password).catch(() => ({
        ok: false as const,
        error: "La suppression a échoué. Réessaie dans un instant.",
      }));
      if (!result.ok) {
        setError(result.error);
        void haptic("warning");
        return;
      }
      toast.success("Ton compte a été supprimé.", {
        description: "Merci d'avoir fait un bout de chemin avec LifeQuest.",
      });
      router.replace("/connexion");
      router.refresh();
    });
  };

  return (
    <Card id="supprimer-mon-compte" className="scroll-mt-24 border-destructive/30">
      <CardHeader>
        <CardTitle>Supprimer mon compte</CardTitle>
        <CardDescription>
          Efface définitivement ton profil, tes objectifs, tes étapes, ton journal, tes
          conversations avec l&apos;assistant et tous tes fichiers. Rien ne pourra être récupéré.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setPassword("");
              setError(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="destructive" disabled={demo}>
              <Trash2 /> Supprimer mon compte
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={confirm} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Supprimer définitivement ?</DialogTitle>
                <DialogDescription>
                  Toute ta quête disparaît, sans retour possible. Confirme avec ton mot de passe.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-1.5">
                <Label htmlFor="delete-password">Mot de passe</Label>
                <Input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </p>
              )}

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="destructive" loading={pending} disabled={!password}>
                  Supprimer définitivement
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <p className="text-xs text-muted-foreground">
          {demo
            ? "Indisponible en démonstration : ce compte d'exemple est partagé."
            : "Ce que nous conservons et pourquoi : "}
          {!demo && (
            <Link href="/confidentialite" className="underline underline-offset-2">
              politique de confidentialité
            </Link>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
