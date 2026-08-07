/**
 * Compte de démonstration — accès public, en lecture seule.
 *
 * Un visiteur peut parcourir toute l'application sans créer de compte. Rien
 * n'est modifiable : sinon le premier curieux venu viderait la vitrine pour
 * tous les suivants.
 *
 * Ce module ne dépend de rien : il est importé par `lib/auth.config.ts`, qui
 * tourne sur le runtime Edge.
 */

export const DEMO_EMAIL = "demo@lifequest.app";

/**
 * Le mot de passe n'est pas un secret — le bouton « Essayer » le joue pour
 * l'utilisateur. Il n'ouvre l'accès qu'à des données factices en lecture seule.
 * Il reste malgré tout côté serveur : l'action de connexion s'en charge, il
 * n'apparaît jamais dans le bundle envoyé au navigateur.
 */
export const DEMO_PASSWORD = "decouverte";

export function isDemoEmail(email: string | null | undefined) {
  return email?.toLowerCase() === DEMO_EMAIL;
}

export const DEMO_REFUSAL = "Mode démonstration : la modification est désactivée.";

/**
 * Vrai si la requête tente d'écrire.
 *
 * Ne concerne que ce que le proxy voit : les pages et leurs Server Actions,
 * reconnaissables à l'en-tête `next-action`. Les routes `/api/*` sont exclues
 * du matcher de `proxy.ts` et portent leur propre garde — voir
 * `/api/uploads` (refus) et `/api/ai/chat` (moteur déterministe).
 *
 * Une requête `GET` ne modifie jamais rien dans cette application.
 */
export function isWriteRequest(_pathname: string, method: string, headers: Headers) {
  if (method === "GET" || method === "HEAD") return false;
  if (headers.has("next-action")) return true;
  // Un POST sur une page sans en-tête `next-action` : soumission native d'un
  // formulaire, par exemple si le JavaScript n'a pas chargé.
  return method === "POST";
}
