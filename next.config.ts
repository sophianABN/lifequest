import type { NextConfig } from "next";

/**
 * En-têtes de sécurité appliqués à toutes les réponses.
 *
 * Pas de `script-src` ici : Next.js injecte des scripts en ligne, une CSP
 * stricte demanderait de générer un nonce par requête dans `proxy.ts`. Les
 * directives ci-dessous n'ont pas ce coût et ferment déjà les vecteurs les
 * plus courants (détournement de formulaire, iframe, reniflage de type).
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Content-Security-Policy",
    // `form-action 'self'` : même un formulaire réécrit par une extension ne
    // peut pas poster les identifiants vers un autre domaine.
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
];

// Envoyé seulement en production : en développement le site est en clair, et
// HSTS épinglerait `http://localhost` en HTTPS dans le navigateur.
const HSTS = {
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload",
};

const nextConfig: NextConfig = {
  /**
   * Origines autorisées à charger les ressources du serveur de développement.
   *
   * Next 16 les bloque par défaut. Ouvrir l'application via l'IP « Network »
   * (`http://192.168.1.54:3000`) sans cette liste empêche le chargement des
   * chunks : React n'hydrate pas et les formulaires retombent sur une
   * soumission native. Renseigner `DEV_ORIGINS` dans `.env` pour tester depuis
   * un téléphone sur le même réseau.
   */
  allowedDevOrigins:
    process.env.DEV_ORIGINS?.split(",")
      .map((o) => o.trim())
      .filter(Boolean) ?? [],

  async headers() {
    return [
      {
        source: "/:path*",
        headers:
          process.env.NODE_ENV === "production"
            ? [...SECURITY_HEADERS, HSTS]
            : SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
