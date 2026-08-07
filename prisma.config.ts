import { defineConfig, env } from "prisma/config";

// Prisma 7 ne charge plus `.env` automatiquement. `loadEnvFile` est natif à
// Node (≥ 20.12) : aucune dépendance supplémentaire n'est nécessaire.
try {
  process.loadEnvFile(".env");
} catch {
  // Pas de fichier .env (CI, production) : les variables viennent de l'environnement.
}

/**
 * Prisma 7 sort l'URL de connexion du schéma : les commandes de migration la
 * lisent ici, et le client applicatif la reçoit via un adaptateur de driver
 * (voir `src/lib/prisma.ts`).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
