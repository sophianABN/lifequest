/**
 * Limiteur de débit en mémoire.
 *
 * Volontairement simple : l'application tourne dans un conteneur unique
 * derrière Traefik, un compteur par processus suffit et évite d'ajouter Redis
 * pour protéger deux formulaires. Si un jour l'application est répliquée, ce
 * module est le seul endroit à remplacer.
 *
 * Fenêtre glissante : on garde les horodatages des tentatives et on jette
 * celles qui sont sorties de la fenêtre à chaque appel.
 */

const attempts = new Map<string, number[]>();

/** Purge périodique : sans elle, la carte grossirait indéfiniment. */
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  /** Secondes avant la prochaine tentative autorisée. */
  retryAfter: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
    attempts.set(key, recent);
    return { allowed: false, retryAfter };
  }

  recent.push(now);
  attempts.set(key, recent);

  // Ménage opportuniste, amorti sur les appels suivants.
  if (attempts.size > MAX_KEYS) {
    for (const [k, times] of attempts) {
      if (times.every((t) => now - t >= windowMs)) attempts.delete(k);
    }
  }

  return { allowed: true, retryAfter: 0 };
}

/** Efface le compteur — appelé après une authentification réussie. */
export function resetRateLimit(key: string) {
  attempts.delete(key);
}

/**
 * Adresse de l'appelant, telle que Traefik la transmet.
 *
 * `x-forwarded-for` est falsifiable si l'application est joignable
 * directement ; dans le déploiement décrit par `docker-compose.prod.yml` elle
 * ne l'est pas, seul le proxy peut l'atteindre. On retient le premier maillon,
 * celui que Traefik a observé.
 */
export function clientIp(headers: Headers | undefined) {
  if (!headers) return "inconnu";
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "inconnu";
}
