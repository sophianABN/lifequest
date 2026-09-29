import { NextResponse } from "next/server";
import type { NextAuthConfig } from "next-auth";

import { DEMO_REFUSAL, isDemoEmail, isWriteRequest } from "@/lib/demo";

/**
 * Configuration *sans dépendance Node* : le middleware s'exécute sur le
 * runtime Edge, où ni Prisma ni bcrypt ne peuvent tourner. On y garde donc
 * uniquement les pages, les callbacks de session et l'autorisation de route.
 * La configuration complète (adaptateur + provider) vit dans `lib/auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/connexion",
    newUser: "/inscription",
  },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      session.user.isDemo = isDemoEmail(token.email);
      return session;
    },
    /**
     * Deux rôles : rediriger les visiteurs non connectés, et refuser toute
     * écriture au compte de démonstration.
     *
     * Ce point de passage est le garde-fou le plus sûr dont on dispose : il
     * couvre les quarante Server Actions existantes et toutes celles à venir,
     * sans dépendre du fait qu'on pense à protéger chacune.
     */
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      // `/confidentialite` : lue avant toute inscription, et liée depuis les
      // fiches App Store et Play Store.
      const publicPaths = ["/connexion", "/inscription", "/bienvenue", "/confidentialite"];
      const isPublic = publicPaths.some((p) => request.nextUrl.pathname.startsWith(p));

      if (
        isLoggedIn &&
        isDemoEmail(auth?.user?.email) &&
        isWriteRequest(request.nextUrl.pathname, request.method, request.headers)
      ) {
        return NextResponse.json({ error: DEMO_REFUSAL }, { status: 403 });
      }

      if (isPublic) return true;
      return isLoggedIn;
    },
  },
  providers: [], // complétés dans lib/auth.ts
} satisfies NextAuthConfig;
