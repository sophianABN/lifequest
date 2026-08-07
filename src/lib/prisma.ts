import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma 7 : la connexion passe par un adaptateur de driver (`pg`) fourni au
 * constructeur, l'URL n'est plus lue depuis le schéma.
 *
 * En développement, Next.js recharge les modules à chaque édition. Sans ce
 * singleton on ouvrirait un nouveau pool à chaque HMR jusqu'à saturer
 * PostgreSQL.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL est absent. Copiez .env.example vers .env puis lancez `npm run db:up`.",
    );
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
