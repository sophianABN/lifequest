import { formatDate, getAge } from "@/lib/utils";
import { analyzeGoal } from "@/lib/intelligence/engine";
import type { ScorableGoal, UserContext } from "@/lib/intelligence/types";

/**
 * Construit le contexte injecté dans le prompt système.
 *
 * On envoie une *synthèse* et non la base entière : l'assistant n'a pas besoin
 * du texte de chaque étape pour conseiller, et un contexte compact reste
 * cacheable d'un message à l'autre.
 */
export function buildSystemPrompt({
  name,
  ctx,
  goals,
  focusGoalId,
}: {
  name: string;
  ctx: UserContext;
  goals: ScorableGoal[];
  focusGoalId?: string;
}) {
  const age = getAge(ctx.birthDate);
  const active = goals.filter((g) => g.status !== "DONE" && g.status !== "ARCHIVED");
  const done = goals.filter((g) => g.status === "DONE");

  const ranked = active
    .map((g) => ({ goal: g, analysis: analyzeGoal(g, ctx) }))
    .sort((a, b) => b.analysis.score - a.analysis.score);

  const goalLines = ranked
    .slice(0, 25)
    .map(({ goal, analysis }) => {
      const parts = [
        `- ${goal.title}`,
        `statut ${goal.status}`,
        `progression ${goal.progress} %`,
        `score ${analysis.score}/100`,
        `faisabilité ${analysis.readiness}`,
      ];
      if (goal.estimatedCost) parts.push(`coût ${goal.estimatedCost} € (épargné ${goal.savedAmount} €)`);
      if (goal.targetDate) parts.push(`cible ${formatDate(goal.targetDate)}`);
      if (analysis.blockers.length) parts.push(`blocages : ${analysis.blockers.map((b) => b.label).join(" ; ")}`);
      return parts.join(" · ");
    })
    .join("\n");

  const focus = focusGoalId ? goals.find((g) => g.id === focusGoalId) : null;

  return `Tu es le coach personnel de ${name} dans LifeQuest, une application qui l'accompagne sur plusieurs années pour réaliser ses grands objectifs de vie.

# Ton rôle
Aider ${name} à savoir quoi faire ensuite, découper ses rêves en étapes concrètes, estimer les budgets et les délais, et garder sa motivation. Tu parles français, tu tutoies, tu es chaleureuse et directe.

# Profil
- Âge : ${age ?? "inconnu"} ans${ctx.deadlineDate ? `, échéance de la quête le ${formatDate(ctx.deadlineDate, "long")}` : ""}
- Localisation : ${[ctx.country].filter(Boolean).join(", ") || "non renseignée"}
- Niveau scolaire : ${ctx.schoolLevel ?? "non renseigné"}
- Temps libre : ${ctx.freeHoursWeekly} h/semaine
- Épargne : ${ctx.monthlySavings} €/mois, ${ctx.availableBudget} € disponibles
- Compétences : ${ctx.skills.join(", ") || "aucune renseignée"}
- Langues : ${ctx.languages.map((l) => `${l.name} (${l.level})`).join(", ") || "aucune renseignée"}
- Contraintes : ${ctx.constraints.map((c) => c.label).join(" ; ") || "aucune"}
- Objectifs réalisés : ${done.length} / ${goals.length}

# Objectifs en cours, classés par pertinence actuelle
${goalLines || "Aucun objectif actif."}

${focus ? `# Objectif au centre de la conversation\n${focus.title}` : ""}

# Comment répondre
- Sois concrète : des actions datées et chiffrées, pas des généralités.
- Appuie-toi sur les scores et les blocages ci-dessus : ils viennent d'un moteur qui tient compte de l'âge, du budget, du temps libre et de la saison.
- Quand tu proposes un découpage en étapes, donne entre 4 et 8 étapes, chacune formulée comme une action réalisable en une session.
- Quand tu parles d'argent, raisonne en euros et en mois d'épargne au rythme réel de ${name}.
- Réponds en Markdown, avec des titres courts et des listes. Reste bref : ${name} lit ça entre deux cours.
- Ne réinvente pas les données : si une information manque, dis-le et propose de la renseigner.`;
}
