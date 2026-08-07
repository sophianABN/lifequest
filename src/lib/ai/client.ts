import Anthropic from "@anthropic-ai/sdk";

/**
 * Sélection du fournisseur — optionnelle.
 *
 * L'assistant est une couche de confort : sans clé API, l'application bascule
 * sur les générateurs déterministes de `lib/ai/generators`. Toutes les
 * fonctionnalités restent disponibles, seule la formulation change.
 *
 * Deux fournisseurs sont câblés. `MISTRAL_API_KEY` est prioritaire : c'est le
 * choix explicite du déploiement, alors qu'une clé Anthropic peut traîner dans
 * l'environnement pour d'autres usages.
 */
export type AiProvider = "mistral" | "anthropic";

export const ANTHROPIC_MODEL = "claude-opus-5";

/** Surchargable pour viser un modèle moins cher (`mistral-small-latest`…). */
export const MISTRAL_MODEL = process.env.MISTRAL_MODEL?.trim() || "mistral-large-latest";

function mistralKey() {
  return process.env.MISTRAL_API_KEY?.trim() || null;
}

function anthropicKey() {
  return process.env.ANTHROPIC_API_KEY?.trim() || null;
}

export function getProvider(): AiProvider | null {
  if (mistralKey()) return "mistral";
  if (anthropicKey()) return "anthropic";
  return null;
}

/** Clé Mistral, ou `null` si le fournisseur actif n'est pas Mistral. */
export function getMistralKey() {
  return getProvider() === "mistral" ? mistralKey() : null;
}

let cachedAnthropic: Anthropic | null | undefined;

export function getAnthropic() {
  if (cachedAnthropic !== undefined) return cachedAnthropic;
  const apiKey = getProvider() === "anthropic" ? anthropicKey() : null;
  cachedAnthropic = apiKey ? new Anthropic({ apiKey }) : null;
  return cachedAnthropic;
}

export function isAiEnabled() {
  return getProvider() !== null;
}

/** Nom affiché dans les paramètres et le bandeau de l'assistant. */
export function aiProviderLabel() {
  switch (getProvider()) {
    case "mistral":
      return `Mistral (${MISTRAL_MODEL})`;
    case "anthropic":
      return "Claude";
    default:
      return "Mode hors-ligne";
  }
}
