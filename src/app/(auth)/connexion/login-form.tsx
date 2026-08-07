"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { AlertCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { signInAsDemo } from "@/server/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [demoEnCours, startDemo] = React.useTransition();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = async (values: LoginInput) => {
    setError(null);
    const res = await signIn("credentials", { ...values, redirect: false });
    if (res?.error) {
      setError("E-mail ou mot de passe incorrect.");
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    // `method="post"` n'est pas décoratif : si le JavaScript ne s'est pas
    // chargé, le navigateur soumet le formulaire nativement. Sans méthode
    // explicite ce serait un GET, et le mot de passe se retrouverait dans
    // l'URL, l'historique, les journaux du serveur et l'en-tête `Referer`.
    <form method="post" onSubmit={form.handleSubmit(submit)} className="mt-8 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input id="email" type="email" autoComplete="email" placeholder="toi@exemple.fr" {...form.register("email")} />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        Reprendre ma quête
      </Button>

      {/* Accès démo — lecture seule, sans inscription. Les identifiants ne
          transitent pas par le formulaire : le visiteur ne voit pas une
          adresse qui n'est pas la sienne, et le mot de passe reste serveur. */}
      <div className="space-y-1.5 pt-1">
        <Button
          type="button"
          variant="soft"
          className="w-full"
          loading={demoEnCours}
          onClick={() =>
            startDemo(async () => {
              setError(null);
              const result = await signInAsDemo();
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.push("/");
              router.refresh();
            })
          }
        >
          <Sparkles /> Essayer le compte de démonstration
        </Button>
        <p className="text-center text-[0.7rem] text-muted-foreground">
          Accès immédiat, sans inscription — en lecture seule.
        </p>
      </div>
    </form>
  );
}
