import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    /** `isDemo` : session de démonstration, en lecture seule. */
    user: { id: string; isDemo?: boolean } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
