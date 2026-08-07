import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="font-display text-3xl">Content de te revoir</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Reprends ta quête là où tu l&apos;as laissée.
      </p>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-blush-600 hover:underline dark:text-blush-300">
          Créer ma quête
        </Link>
      </p>
    </div>
  );
}
