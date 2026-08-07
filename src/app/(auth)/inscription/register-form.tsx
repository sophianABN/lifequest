"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { registerUser } from "@/server/actions/auth";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", birthDate: "" },
  });

  const submit = async (values: RegisterInput) => {
    setError(null);
    const result = await registerUser(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // Connexion immédiate : demander de se reconnecter juste après l'inscription
    // est une friction inutile.
    await signIn("credentials", { email: values.email, password: values.password, redirect: false });
    router.push("/");
    router.refresh();
  };

  const field = (name: keyof RegisterInput) => form.formState.errors[name]?.message;

  return (
    // Voir `login-form.tsx` : sans `method="post"`, un repli natif enverrait le
    // mot de passe dans l'URL.
    <form method="post" onSubmit={form.handleSubmit(submit)} className="mt-8 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Prénom</Label>
        <Input id="name" placeholder="Arwa" autoComplete="given-name" {...form.register("name")} />
        {field("name") && <p className="text-xs text-destructive">{field("name")}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="birthDate">Date de naissance</Label>
        <Input id="birthDate" type="date" {...form.register("birthDate")} />
        <p className="text-[0.7rem] text-muted-foreground">
          Sert à calculer ton échéance et à détecter les objectifs soumis à un âge minimum.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input id="email" type="email" autoComplete="email" placeholder="toi@exemple.fr" {...form.register("email")} />
        {field("email") && <p className="text-xs text-destructive">{field("email")}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
          {field("password") && <p className="text-xs text-destructive">{field("password")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmation</Label>
          <Input id="confirmPassword" type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
          {field("confirmPassword") && <p className="text-xs text-destructive">{field("confirmPassword")}</p>}
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        Créer ma quête
      </Button>
    </form>
  );
}
