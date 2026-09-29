import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Créer ma quête" };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="font-display text-3xl">Commence ta quête</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Quelques informations, et l&apos;application saura déjà quoi te conseiller.
      </p>

      <RegisterForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Tu as déjà un compte ?{" "}
        <Link href="/connexion" className="font-semibold text-blush-600 hover:underline dark:text-blush-300">
          Se connecter
        </Link>
      </p>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        En créant ta quête, tu acceptes que LifeQuest conserve ce que tu y inscris —{" "}
        <Link href="/confidentialite" className="underline underline-offset-2 hover:text-foreground">
          voir la politique de confidentialité
        </Link>
        .
      </p>
    </div>
  );
}
