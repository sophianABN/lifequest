/**
 * Seed de démonstration.
 *
 * Crée un compte complet et vivant : profil, 25 objectifs avec leurs étapes,
 * historique de journal, XP, badges déjà débloqués, notifications et
 * événements de calendrier. L'application est ainsi immédiatement
 * démontrable, sans écran vide.
 *
 *   npm run db:seed
 */
import "./load-env"; // doit rester le premier import

import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { SEED_GOALS, type SeedStep } from "./seed-data/goals";
import { SEED_BADGES } from "./seed-data/badges";
import { SEED_QUOTES } from "./seed-data/quotes";

const DEMO_EMAIL = "arwa@lifequest.app";
const DEMO_PASSWORD = "lifequest";

const CATEGORIES = [
  { name: "Voyage", slug: "voyage", color: "aqua", emoji: "✈️" },
  { name: "Sport", slug: "sport", color: "blush", emoji: "🥊" },
  { name: "Études", slug: "etudes", color: "lilac", emoji: "🎓" },
  { name: "Carrière", slug: "carriere", color: "gold", emoji: "💼" },
  { name: "Aventure", slug: "aventure", color: "mint", emoji: "🪂" },
  { name: "Créativité", slug: "creativite", color: "peach", emoji: "🎬" },
  { name: "Famille & amis", slug: "famille-amis", color: "blush", emoji: "💛" },
  { name: "Style de vie", slug: "style-de-vie", color: "lilac", emoji: "✨" },
];

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000);
const monthsFromNow = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
};

async function main() {
  console.log("🌸 Seed LifeQuest…");

  // ── Nettoyage : l'ordre respecte les contraintes de clés étrangères ────────
  await prisma.$transaction([
    prisma.aiMessage.deleteMany(),
    prisma.aiConversation.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.xpEvent.deleteMany(),
    prisma.userBadge.deleteMany(),
    prisma.badge.deleteMany(),
    prisma.journalPhoto.deleteMany(),
    prisma.journalEntry.deleteMany(),
    prisma.calendarEvent.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.goalPerson.deleteMany(),
    prisma.goalDependency.deleteMany(),
    prisma.checklistItem.deleteMany(),
    prisma.step.deleteMany(),
    prisma.goal.deleteMany(),
    prisma.category.deleteMany(),
    prisma.person.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.language.deleteMany(),
    prisma.constraint.deleteMany(),
    prisma.quote.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // ── Citations & badges (données globales) ─────────────────────────────────
  await prisma.quote.createMany({ data: SEED_QUOTES });
  await prisma.badge.createMany({
    data: SEED_BADGES.map((b) => ({ ...b, rule: b.rule as unknown as Prisma.InputJsonValue })),
  });
  console.log(`  ✓ ${SEED_QUOTES.length} citations, ${SEED_BADGES.length} badges`);

  // ── Utilisateur ───────────────────────────────────────────────────────────
  // 22 ans aujourd'hui, échéance au 25e anniversaire : la quête a du sens
  // quelle que soit la date d'exécution du seed.
  const birthDate = new Date();
  birthDate.setFullYear(birthDate.getFullYear() - 22);
  birthDate.setMonth(2, 15);
  const deadlineDate = new Date(birthDate);
  deadlineDate.setFullYear(birthDate.getFullYear() + 25);

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Arwa",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      birthDate,
      deadlineDate,
      questTitle: "25 choses à faire avant mes 25 ans",
      bio: "Boxeuse, future prof de maths, collectionneuse de premières fois.",
      city: "Toulouse",
      country: "France",
      schoolLevel: "Licence 3 — Mathématiques",
      freeHoursWeekly: 14,
      monthlySavings: 220,
      availableBudget: 480,
      xp: 3140,
      level: 1, // recalculé plus bas
      streakCurrent: 12,
      streakLongest: 34,
      lastActiveDate: new Date(),
      onboardedAt: daysFromNow(-400),
      skills: {
        create: [
          { name: "Boxe anglaise", level: "ADVANCED" },
          { name: "Mathématiques", level: "ADVANCED" },
          { name: "Photographie", level: "INTERMEDIATE" },
          { name: "Montage vidéo", level: "BEGINNER" },
          { name: "Vélo longue distance", level: "INTERMEDIATE" },
        ],
      },
      languages: {
        create: [
          { name: "Français", level: "C2" },
          { name: "Arabe", level: "B1" },
          { name: "Anglais", level: "B2", target: "C1" },
          { name: "Allemand", level: "A2", target: "C1" },
        ],
      },
      constraints: {
        create: [
          { label: "Cours en semaine jusqu'en juin", until: monthsFromNow(10) },
          { label: "Pas plus de 3 semaines d'absence d'affilée", until: null },
        ],
      },
    },
  });
  console.log(`  ✓ utilisateur ${user.email}`);

  // ── Catégories & personnes ────────────────────────────────────────────────
  await prisma.category.createMany({
    data: CATEGORIES.map((c, i) => ({ ...c, userId: user.id, order: i })),
  });
  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  const peopleNames = [...new Set(SEED_GOALS.flatMap((g) => g.people ?? []))];
  await prisma.person.createMany({
    data: peopleNames.map((name) => ({
      userId: user.id,
      name,
      role:
        name === "Aboud" ? "Meilleur ami" : name === "JUL" ? "Idole" : name === "Papi" || name === "Mami" ? "Famille" : null,
    })),
  });
  const people = await prisma.person.findMany({ where: { userId: user.id } });
  const personByName = new Map(people.map((p) => [p.name, p.id]));

  // ── Objectifs ─────────────────────────────────────────────────────────────
  const goalIdBySlug = new Map<string, string>();

  for (const [index, seed] of SEED_GOALS.entries()) {
    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        slug: seed.slug,
        title: seed.title,
        emoji: seed.emoji,
        description: seed.description,
        motivation: seed.motivation,
        notes: seed.notes,
        color: seed.color,
        categoryId: categoryBySlug.get(seed.category) ?? null,
        status: seed.status,
        priority: seed.priority,
        difficulty: seed.difficulty,
        estimatedCost: seed.estimatedCost,
        savedAmount: seed.savedAmount ?? 0,
        estimatedHours: seed.estimatedHours,
        targetDate: seed.monthsFromNow != null ? monthsFromNow(seed.monthsFromNow) : null,
        startDate: seed.status === "IN_PROGRESS" ? daysFromNow(-90) : null,
        completedAt: seed.status === "DONE" ? monthsFromNow(seed.monthsFromNow ?? 0) : null,
        country: seed.country,
        city: seed.city,
        minAge: seed.minAge,
        isFinal: seed.isFinal ?? false,
        isFavorit: seed.isFavorit ?? false,
        order: index,
        checklist: {
          create: (seed.checklist ?? []).map((label, i) => ({
            label,
            order: i,
            // Un peu d'aléa reproductible pour que les checklists ne soient pas vides
            done: seed.status === "DONE" || (seed.status === "IN_PROGRESS" && i === 0),
          })),
        },
        people: {
          create: (seed.people ?? [])
            .map((n) => personByName.get(n))
            .filter((id): id is string => Boolean(id))
            .map((personId) => ({ personId })),
        },
      },
    });
    goalIdBySlug.set(seed.slug, goal.id);

    // Étapes (récursif, deux niveaux dans le jeu de données)
    const createSteps = async (steps: SeedStep[], parentId: string | null) => {
      for (const [i, step] of steps.entries()) {
        const created = await prisma.step.create({
          data: {
            goalId: goal.id,
            parentId,
            title: step.title,
            description: step.description,
            done: step.done ?? seed.status === "DONE",
            completedAt: step.done || seed.status === "DONE" ? daysFromNow(-Math.floor(Math.random() * 120)) : null,
            dueDate: step.dueInDays != null ? daysFromNow(step.dueInDays) : null,
            estimatedMinutes: step.estimatedMinutes,
            priority: step.priority ?? "MEDIUM",
            order: i,
          },
        });
        if (step.children?.length) await createSteps(step.children, created.id);
      }
    };
    await createSteps(seed.steps ?? [], null);
  }
  console.log(`  ✓ ${SEED_GOALS.length} objectifs`);

  // ── Dépendances entre objectifs ───────────────────────────────────────────
  for (const seed of SEED_GOALS) {
    for (const prereq of seed.dependsOn ?? []) {
      const goalId = goalIdBySlug.get(seed.slug);
      const prerequisiteId = goalIdBySlug.get(prereq);
      if (goalId && prerequisiteId) {
        await prisma.goalDependency.create({ data: { goalId, prerequisiteId } });
      }
    }
  }

  // ── Progression dénormalisée ──────────────────────────────────────────────
  const { recomputeGoalProgress } = await import("../src/server/progress");
  for (const goalId of goalIdBySlug.values()) await recomputeGoalProgress(goalId);
  console.log("  ✓ progression calculée");

  // ── Journal : 45 derniers jours, avec des trous réalistes ─────────────────
  const journalSamples = [
    { did: "Trois rounds de sparring, j'ai tenu sans reculer.", learned: "Garder la garde haute même fatiguée.", mood: "GREAT" },
    { did: "Révisé l'algèbre linéaire pendant 2 h.", learned: "Les valeurs propres, enfin.", mood: "GOOD" },
    { did: "Repéré deux camps de Muay Thaï, comparé les prix.", learned: "Novembre à mars, c'est la bonne fenêtre.", mood: "GOOD" },
    { did: "Journée molle, rien fait.", learned: "Se reposer n'est pas reculer.", mood: "NEUTRAL" },
    { did: "45 km de vélo avec Aboud.", learned: "Mes jambes tiennent plus que ma tête.", mood: "GREAT" },
    { did: "Casting figuration raté.", learned: "Ce n'était pas mon rôle, pas mon niveau qui était en cause.", mood: "BAD" },
    { did: "Mis 60 € de côté pour la Thaïlande.", learned: "L'épargne automatique change tout.", mood: "GOOD" },
    { did: "Une heure d'allemand, série en VO.", learned: "Je comprends sans sous-titres maintenant.", mood: "GOOD" },
  ] as const;

  const journalData = [];
  for (let i = 0; i < 45; i++) {
    if (i % 4 === 3) continue; // trous : personne n'écrit tous les jours
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const s = journalSamples[i % journalSamples.length];
    journalData.push({
      userId: user.id,
      date,
      whatIDid: s.did,
      whatILearned: s.learned,
      mood: s.mood,
      gratitude: i % 5 === 0 ? "Ma famille, qui ne m'a jamais dit que c'était impossible." : null,
    });
  }
  await prisma.journalEntry.createMany({ data: journalData });
  console.log(`  ✓ ${journalData.length} entrées de journal`);

  // ── Historique d'XP réparti sur 12 mois (pour les courbes d'analytics) ────
  const xpData = [];
  for (let i = 360; i >= 0; i -= 3) {
    const createdAt = daysFromNow(-i);
    xpData.push({
      userId: user.id,
      amount: 5 + Math.floor(Math.random() * 25),
      reason: "Étape terminée",
      createdAt,
    });
  }
  xpData.push({ userId: user.id, amount: 250, reason: "Objectif terminé : Avoir le bac avec mention", createdAt: daysFromNow(-300) });
  await prisma.xpEvent.createMany({ data: xpData });

  const totalXp = xpData.reduce((s, e) => s + e.amount, 0);
  const { levelFromXp } = await import("../src/lib/gamification");
  await prisma.user.update({
    where: { id: user.id },
    data: { xp: totalXp, level: levelFromXp(totalXp) },
  });
  console.log(`  ✓ ${totalXp} XP — niveau ${levelFromXp(totalXp)}`);

  // ── Badges déjà débloqués ─────────────────────────────────────────────────
  const badges = await prisma.badge.findMany();
  const unlocked = ["first-goal", "ten-steps", "fifty-steps", "streak-7", "streak-30", "journal-1", "journal-30", "saved-1000", "xp-1000"];
  await prisma.userBadge.createMany({
    data: badges
      .filter((b) => unlocked.includes(b.code))
      .map((b, i) => ({ userId: user.id, badgeId: b.id, unlockedAt: daysFromNow(-i * 20 - 5), seen: i > 1 })),
  });

  // ── Événements de calendrier issus des étapes datées ──────────────────────
  const datedSteps = await prisma.step.findMany({
    where: { goal: { userId: user.id }, dueDate: { not: null } },
    include: { goal: true },
  });
  await prisma.calendarEvent.createMany({
    data: datedSteps.map((s) => ({
      userId: user.id,
      goalId: s.goalId,
      stepId: s.id,
      title: s.title,
      start: s.dueDate!,
      allDay: true,
      kind: "TASK" as const,
      color: s.goal.color,
      done: s.done,
    })),
  });

  // Quelques rendez-vous personnels pour peupler la vue semaine
  await prisma.calendarEvent.createMany({
    data: [
      { userId: user.id, title: "Entraînement boxe", start: daysFromNow(1), kind: "EVENT", color: "blush" },
      { userId: user.id, title: "Cours d'allemand", start: daysFromNow(2), kind: "EVENT", color: "lilac" },
      { userId: user.id, title: "Sortie vélo 60 km", start: daysFromNow(4), kind: "EVENT", color: "mint" },
      { userId: user.id, title: "Virement épargne Thaïlande", start: daysFromNow(6), kind: "REMINDER", color: "gold" },
      { userId: user.id, title: "Appeler Papi et Mami", start: daysFromNow(3), kind: "REMINDER", color: "gold" },
    ],
  });
  console.log(`  ✓ ${datedSteps.length + 5} événements de calendrier`);

  // ── Notifications ─────────────────────────────────────────────────────────
  const boxingGoalId = goalIdBySlug.get("camp-boxe-thai-thailande");
  await prisma.notification.createMany({
    data: [
      { userId: user.id, type: "MOTIVATION", title: "12 jours de série 🔥", body: "Tu n'as pas lâché depuis presque deux semaines.", href: "/" },
      { userId: user.id, type: "GOAL_DEADLINE", title: "Vespa : plus que 7 mois", body: "Il te manque 800 € — soit 4 mois d'épargne.", href: "/objectifs/avoir-un-vespa", goalId: goalIdBySlug.get("avoir-un-vespa") },
      { userId: user.id, type: "STEP_OVERDUE", title: "Une étape t'attend", body: "« Bande démo de 90 secondes » n'a pas bougé depuis 3 semaines.", href: "/objectifs/jouer-dans-un-film" },
      { userId: user.id, type: "BADGE_UNLOCKED", title: "Badge débloqué : Mémoire vive", body: "30 entrées de journal. Tu écris ta propre histoire.", href: "/badges" },
      { userId: user.id, type: "REMINDER", title: "Fenêtre idéale pour la Thaïlande", body: "Novembre à mars : c'est le moment de réserver.", href: "/objectifs/camp-boxe-thai-thailande", goalId: boxingGoalId, readAt: daysFromNow(-2) },
    ],
  });

  // ── Un commentaire et une conversation IA pour l'exemple ──────────────────
  if (boxingGoalId) {
    await prisma.comment.create({
      data: {
        goalId: boxingGoalId,
        userId: user.id,
        body: "Le camp de Chiang Mai a répondu : 380 €/semaine tout compris, dortoir sur place.",
      },
    });
  }

  console.log("\n✨ Seed terminé.");
  console.log(`   Connexion : ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
