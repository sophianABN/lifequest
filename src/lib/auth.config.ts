import type { NextAuthConfig } from "next-auth";

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
      return session;
    },
    /** Redirige les visiteurs non connectés vers la page de connexion. */
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const publicPaths = ["/connexion", "/inscription", "/bienvenue"];
      const isPublic = publicPaths.some((p) => request.nextUrl.pathname.startsWith(p));
      if (isPublic) return true;
      return isLoggedIn;
    },
  },
  providers: [], // complétés dans lib/auth.ts
} satisfies NextAuthConfig;
