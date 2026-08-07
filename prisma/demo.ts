/**
 * Provisionne le compte de démonstration — utilisable en production.
 *
 * Contrairement à `db:seed`, ce script ne vide rien : il supprime le seul
 * compte de démonstration (les données liées suivent en cascade), puis le
 * recrée à neuf. Les comptes réels ne sont jamais touchés.
 *
 * À rejouer quand la vitrine s'est fanée : les dates du jeu de données sont
 * relatives à l'instant du seed, elles vieillissent.
 *
 *   npm run db:demo
 */
import "./load-env"; // doit rester le premier import

import { prisma } from "@/lib/prisma";
import { DEMO_EMAIL } from "@/lib/demo";
import { createDemoUser, seedGlobals } from "./seed";

async function main() {
  console.log(`🌸 Compte de démonstration : ${DEMO_EMAIL}`);

  const existant = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true },
  });
  if (existant) {
    await prisma.user.delete({ where: { id: existant.id } });
    console.log("  ✓ ancien compte supprimé");
  }

  await seedGlobals();
  await createDemoUser();

  const restants = await prisma.user.count();
  console.log(`\n✨ Prêt. ${restants} compte(s) en base — les autres sont intacts.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
