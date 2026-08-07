import { GOAL_COLORS } from "@/lib/constants";
import type { ScorableGoal, UserContext } from "@/lib/intelligence/types";
import { analyzeGoal, seasonWindow } from "@/lib/intelligence/engine";

/* ═══════════════════════════════════════════════════════════════════════════
   GÉNÉRATEURS DÉTERMINISTES
   ---------------------------------------------------------------------------
   Ce module est le *repli* de l'assistant IA — et son filet de sécurité.
   Sans clé API, ou si l'appel échoue, l'utilisateur obtient malgré tout des
   étapes, un budget et un planning cohérents. L'application ne dépend donc
   jamais d'un service externe pour rester utilisable.

   Les modèles ci-dessous sont écrits à partir des catégories d'objectifs et
   de mots-clés du titre : c'est volontairement simple et prévisible.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface GeneratedStep {
  title: string;
  description?: string;
  estimatedMinutes?: number;
  /** Décalage en jours par rapport à aujourd'hui */
  offsetDays?: number;
}

type Template = {
  match: (input: { title: string; category: string | null; country: string | null }) => boolean;
  steps: GeneratedStep[];
};

const TEMPLATES: Template[] = [
  {
    match: ({ category, country }) => category === "voyage" || Boolean(country),
    steps: [
      { title: "Choisir la période et la durée", description: "Croiser météo, prix et disponibilités.", estimatedMinutes: 60 },
      { title: "Estimer le budget total", description: "Transport, hébergement, activités, imprévus (+15 %).", estimatedMinutes: 45 },
      { title: "Mettre en place une épargne dédiée", description: "Virement automatique le jour de la paie." },
      { title: "Vérifier les formalités", description: "Passeport, visa, vaccins, assurance." },
      { title: "Réserver le transport", estimatedMinutes: 60 },
      { title: "Réserver l'hébergement", estimatedMinutes: 45 },
      { title: "Préparer l'itinéraire jour par jour", estimatedMinutes: 90 },
      { title: "Faire le sac et vérifier la checklist" },
    ],
  },
  {
    match: ({ category, title }) => category === "sport" || /boxe|kung-fu|marathon|vélo|velo|muscu/i.test(title),
    steps: [
      { title: "Faire un bilan de forme actuel", description: "Test simple : endurance, force, souplesse.", estimatedMinutes: 60 },
      { title: "Définir un plan d'entraînement hebdomadaire", estimatedMinutes: 45 },
      { title: "Trouver un club ou un coach" },
      { title: "S'équiper correctement", description: "Privilégier la sécurité avant l'esthétique." },
      { title: "Tenir 8 semaines d'entraînement régulier", estimatedMinutes: 60 },
      { title: "Évaluer les progrès et ajuster" },
    ],
  },
  {
    match: ({ category, title }) => category === "etudes" || /bac|diplôme|diplome|langue|examen|licence|master/i.test(title),
    steps: [
      { title: "Identifier le niveau à atteindre et la date d'examen", estimatedMinutes: 30 },
      { title: "Rassembler les ressources (cours, manuels, applications)", estimatedMinutes: 60 },
      { title: "Bloquer des créneaux de travail récurrents", description: "Mieux vaut 30 min par jour que 4 h le dimanche.", estimatedMinutes: 30 },
      { title: "Faire un premier test blanc pour situer le niveau" },
      { title: "Trouver un partenaire de révision ou un groupe" },
      { title: "S'inscrire officiellement à l'examen" },
      { title: "Réviser les points faibles identifiés" },
    ],
  },
  {
    match: ({ category, title }) => category === "carriere" || /prof|métier|metier|concours|emploi|entreprise/i.test(title),
    steps: [
      { title: "Cartographier le parcours nécessaire", description: "Diplômes, concours, expériences requises.", estimatedMinutes: 90 },
      { title: "Rencontrer quelqu'un qui fait déjà ce métier", estimatedMinutes: 60 },
      { title: "Identifier la prochaine étape administrative" },
      { title: "Constituer le dossier de candidature" },
      { title: "Faire un stage ou une immersion" },
      { title: "Préparer les épreuves ou les entretiens" },
    ],
  },
  {
    match: ({ category, title }) => category === "creativite" || /film|photo|interview|podcast|jeu télévisé|jeu televise|casting/i.test(title),
    steps: [
      { title: "Définir précisément le résultat visé", estimatedMinutes: 30 },
      { title: "Étudier trois exemples inspirants", estimatedMinutes: 60 },
      { title: "Constituer un book ou une démo" },
      { title: "Lister les personnes ou structures à contacter" },
      { title: "Envoyer les premières candidatures", estimatedMinutes: 90 },
      { title: "Relancer au bout de deux semaines" },
    ],
  },
  {
    match: ({ category, title }) => category === "aventure" || /saut|urbex|parachute|élastique|elastique|safari/i.test(title),
    steps: [
      { title: "Vérifier les conditions d'accès et de sécurité", description: "Âge minimum, certificat médical, législation.", estimatedMinutes: 45 },
      { title: "Choisir un prestataire ou un lieu fiable" },
      { title: "Fixer une date et prévenir un proche" },
      { title: "Réserver et régler l'acompte" },
      { title: "Préparer l'équipement" },
      { title: "Prévoir de quoi garder une trace (photo / vidéo)" },
    ],
  },
];

const GENERIC_STEPS: GeneratedStep[] = [
  { title: "Préciser ce que « réussi » veut dire pour cet objectif", estimatedMinutes: 30 },
  { title: "Lister les 3 obstacles les plus probables", estimatedMinutes: 30 },
  { title: "Trouver une personne qui l'a déjà fait et lui poser 3 questions" },
  { title: "Estimer le coût et le temps nécessaires", estimatedMinutes: 45 },
  { title: "Fixer une date cible réaliste" },
  { title: "Faire la première action concrète cette semaine" },
];

/**
 * Génère un découpage en étapes pour un objectif.
 * Les dates sont réparties proportionnellement jusqu'à la date cible.
 */
export function generateSteps(input: {
  title: string;
  category: string | null;
  country: string | null;
  targetDate: Date | null;
  estimatedCost: number | null;
}): GeneratedStep[] {
  const template = TEMPLATES.find((t) => t.match(input));
  const steps = [...(template?.steps ?? GENERIC_STEPS)];

  // Ajoute une étape d'épargne quand l'objectif a un coût significatif.
  if (input.estimatedCost && input.estimatedCost > 500) {
    steps.splice(2, 0, {
      title: `Épargner ${input.estimatedCost} €`,
      description: "Ouvrir un compte dédié et automatiser le virement mensuel.",
    });
  }

  // Répartition des échéances jusqu'à la date cible.
  if (input.targetDate) {
    const total = Math.max(1, Math.round((input.targetDate.getTime() - Date.now()) / 86_400_000));
    return steps.map((s, i) => ({
      ...s,
      offsetDays: Math.round((total * (i + 1)) / (steps.length + 1)),
    }));
  }

  return steps;
}

/** Plan d'épargne mensuel pour atteindre le budget d'un objectif. */
export function generateBudgetPlan(goal: ScorableGoal, ctx: UserContext) {
  const cost = goal.estimatedCost ?? 0;
  const missing = Math.max(0, cost - goal.savedAmount);
  const monthsUntilTarget = goal.targetDate
    ? Math.max(1, Math.round((goal.targetDate.getTime() - ctx.now.getTime()) / (30 * 86_400_000)))
    : null;

  const requiredMonthly = monthsUntilTarget ? Math.ceil(missing / monthsUntilTarget) : null;
  const monthsAtCurrentRate = ctx.monthlySavings > 0 ? Math.ceil(missing / ctx.monthlySavings) : null;

  return {
    cost,
    saved: goal.savedAmount,
    missing,
    monthsUntilTarget,
    requiredMonthly,
    monthsAtCurrentRate,
    feasible: requiredMonthly == null || requiredMonthly <= ctx.monthlySavings,
    advice:
      missing === 0
        ? "Cet objectif est entièrement financé. Il ne reste plus qu'à passer à l'action."
        : requiredMonthly == null
          ? `Il manque ${missing} €. Fixe une date cible pour obtenir un rythme d'épargne précis.`
          : requiredMonthly <= ctx.monthlySavings
            ? `En mettant ${requiredMonthly} €/mois de côté, tu y es à temps — c'est dans tes moyens actuels (${ctx.monthlySavings} €/mois).`
            : `Il faudrait ${requiredMonthly} €/mois alors que tu épargnes ${ctx.monthlySavings} €/mois. Deux options : repousser la date de ${Math.ceil(missing / Math.max(1, ctx.monthlySavings)) - (monthsUntilTarget ?? 0)} mois, ou trouver un complément de revenus.`,
  };
}

/** Planning hebdomadaire réparti sur les objectifs les plus prioritaires. */
export function generateWeeklyPlan(goals: ScorableGoal[], ctx: UserContext) {
  const ranked = goals
    .filter((g) => g.status !== "DONE" && g.status !== "ARCHIVED")
    .map((g) => ({ goal: g, analysis: analyzeGoal(g, ctx) }))
    .filter((x) => x.analysis.readiness !== "LOCKED")
    .sort((a, b) => b.analysis.score - a.analysis.score)
    .slice(0, 5);

  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  // On répartit le temps libre en privilégiant le week-end.
  const weights = [0.1, 0.1, 0.12, 0.1, 0.13, 0.25, 0.2];

  return days.map((day, i) => {
    const minutes = Math.round(ctx.freeHoursWeekly * 60 * weights[i]);
    const focus = ranked[i % Math.max(1, ranked.length)];
    return {
      day,
      minutes,
      goalId: focus?.goal.id ?? null,
      goalTitle: focus?.goal.title ?? null,
      suggestion: focus
        ? focus.analysis.nextActions[0]?.label ?? "Avancer sur la prochaine étape"
        : "Journée libre — repose-toi, ça compte aussi.",
    };
  });
}

/** Réponse textuelle de repli quand l'assistant IA n'est pas disponible. */
export function offlineAnswer(question: string, goals: ScorableGoal[], ctx: UserContext) {
  const q = question.toLowerCase();

  const analyses = goals
    .filter((g) => g.status !== "DONE" && g.status !== "ARCHIVED")
    .map((g) => ({ goal: g, analysis: analyzeGoal(g, ctx) }))
    .sort((a, b) => b.analysis.score - a.analysis.score);

  const top = analyses[0];

  if (/quoi|que dois|maintenant|aujourd/i.test(q) && top) {
    const action = top.analysis.nextActions[0];
    return [
      `Aujourd'hui, concentre-toi sur **${top.goal.title}** (score ${top.analysis.score}/100).`,
      action ? `\n\n**Prochaine action :** ${action.label}\n${action.reason}` : "",
      top.analysis.bestWindow ? `\n\n📅 ${top.analysis.bestWindow}` : "",
    ].join("");
  }

  if (/bloque|blocage|pourquoi|impossible/i.test(q) && top) {
    const blockers = top.analysis.blockers;
    if (blockers.length === 0) return `Rien ne bloque **${top.goal.title}** en ce moment. Tu peux y aller.`;
    return [
      `Ce qui bloque **${top.goal.title}** :`,
      ...blockers.map((b) => `\n- ${b.hard ? "🔒" : "⚠️"} ${b.label}`),
    ].join("");
  }

  if (/combien|coût|cout|budget|argent|épargne|epargne/i.test(q) && top) {
    const plan = generateBudgetPlan(top.goal, ctx);
    return `**${top.goal.title}** — ${plan.cost} € au total, ${plan.saved} € déjà épargnés.\n\n${plan.advice}`;
  }

  if (/planning|semaine|organis|calendrier/i.test(q)) {
    const plan = generateWeeklyPlan(goals, ctx);
    return [
      "Voici une répartition de ton temps libre cette semaine :",
      ...plan
        .filter((d) => d.minutes > 0)
        .map((d) => `\n- **${d.day}** (${d.minutes} min) — ${d.goalTitle ?? "libre"} : ${d.suggestion}`),
    ].join("");
  }

  if (/priorit|ordre|classe/i.test(q)) {
    return [
      "Voici l'ordre que je te conseille, en tenant compte de ton budget, de ton temps et de la saison :",
      ...analyses
        .slice(0, 6)
        .map((a, i) => `\n${i + 1}. **${a.goal.title}** — score ${a.analysis.score}/100`),
    ].join("");
  }

  // Réponse par défaut : le point général.
  return [
    "Je fonctionne actuellement en mode hors-ligne (aucune clé API configurée), mais je peux quand même t'aider.",
    top
      ? `\n\nEn ce moment, ton objectif le plus pertinent est **${top.goal.title}**. ${top.analysis.nextActions[0]?.label ?? ""}`
      : "",
    "\n\nEssaie : « Que dois-je faire maintenant ? », « Qu'est-ce qui bloque cet objectif ? », « Génère un planning », « Combien ça va coûter ? »",
  ].join("");
}

/** Couleur suggérée pour un nouvel objectif, dérivée de son titre. */
export function suggestColor(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash << 5) - hash + title.charCodeAt(i);
  return GOAL_COLORS[Math.abs(hash) % GOAL_COLORS.length];
}

/** Fenêtre saisonnière lisible, exposée à l'assistant. */
export function bestWindowFor(goal: ScorableGoal) {
  return seasonWindow(goal)?.label ?? null;
}
