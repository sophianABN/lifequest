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

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
