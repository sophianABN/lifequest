/**
 * Charge `.env` avant tout autre import.
 *
 * Les scripts lancés via `tsx` (seed, tâches de maintenance) ne passent pas par
 * le chargement d'environnement de Next.js. Ce module doit être importé en
 * *première* position : les imports ES sont évalués dans l'ordre, ce qui
 * garantit que `DATABASE_URL` est disponible quand le client Prisma s'initialise.
 */
try {
  process.loadEnvFile(".env");
} catch {
  // Aucun fichier .env : les variables viennent déjà de l'environnement.
}

export {};
