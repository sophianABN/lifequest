import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth.config";

/**
 * Protection des routes (anciennement `middleware.ts`, renommé `proxy.ts`
 * dans Next.js 16).
 *
 * S'exécute sur le runtime Edge : on n'y monte que la configuration allégée
 * d'Auth.js, sans Prisma ni bcrypt.
 */
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

/**
 * `apple-icon` et `opengraph-image` sont des routes générées par Next, sans
 * extension de fichier : sans exclusion explicite elles tombent sous la
 * protection et repartent en 307 vers l'écran de connexion. Un aperçu de lien
 * ou une icône d'écran d'accueil n'est évidemment jamais authentifié.
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|icon|apple-icon|opengraph-image|twitter-image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
