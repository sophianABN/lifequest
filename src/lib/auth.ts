import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { loginSchema } from "@/lib/validations/auth";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";

/** 10 essais par quart d'heure : indolore à l'usage, rédhibitoire pour un robot. */
const LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/**
 * Condensat bcrypt d'une valeur arbitraire, jamais égal à un vrai mot de passe.
 * Sert uniquement à consommer le même temps de calcul quand le compte n'existe
 * pas (voir `authorize`).
 */
const DUMMY_HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "E-mail",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        // Clé (e-mail + adresse) : limiter sur le seul e-mail permettrait à un
        // tiers de bloquer volontairement le compte de quelqu'un d'autre.
        const key = `login:${email}:${clientIp(request?.headers)}`;
        if (!rateLimit(key, LOGIN_ATTEMPTS, LOGIN_WINDOW_MS).allowed) return null;

        const user = await prisma.user.findUnique({ where: { email } });

        // Compte inexistant : on compare quand même contre un condensat
        // factice. Sans cela, la réponse serait nettement plus rapide et
        // permettrait de savoir quelles adresses sont inscrites.
        const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
        if (!user?.passwordHash || !valid) return null;

        resetRateLimit(key);
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
});

/**
 * Récupère l'utilisateur courant ou lève une erreur.
 * Utilisé en tête de chaque Server Action et de chaque requête serveur : le
 * middleware protège déjà les routes, mais une action peut être appelée
 * directement — l'autorisation doit être vérifiée au plus près de la donnée.
 */
export async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.id;
}

export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}
