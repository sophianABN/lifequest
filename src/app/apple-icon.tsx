import { ImageResponse } from "next/og";

/**
 * Icône d'écran d'accueil iOS.
 *
 * Générée à la volée plutôt que stockée en PNG : le signe ne vit qu'à un seul
 * endroit (`components/shared/logo.tsx` et `icon.svg`), et le dépôt reste
 * exempt de binaire à régénérer à chaque retouche.
 *
 * iOS ignore la transparence et applique lui-même les coins arrondis : le fond
 * est donc plein et le tracé occupe toute la surface.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Le signe, sans sa pastille — le dégradé est posé par le conteneur. */
const TRACE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="180" height="180">
  <path d="M13.5 51 C 22 51 29.5 46 34.5 36.5" fill="none" stroke="#fff" stroke-width="5.2" stroke-linecap="round"/>
  <circle cx="13.5" cy="51" r="4" fill="#fff"/>
  <g transform="translate(35 8) scale(0.95)" fill="#fff">
    <path d="M12 0c.6 5.6 5.8 10.8 11.4 11.4v1.2C17.8 13.2 12.6 18.4 12 24h-1.2C10.2 18.4 5 13.2-.6 12.6v-1.2C5 10.8 10.2 5.6 10.8 0Z"/>
  </g>
</svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundImage: "linear-gradient(135deg, #f295b6 0%, #a98ad4 48%, #45bcae 100%)",
        }}
      >
        <img
          width={180}
          height={180}
          alt=""
          src={`data:image/svg+xml;base64,${Buffer.from(TRACE).toString("base64")}`}
        />
      </div>
    ),
    size,
  );
}
