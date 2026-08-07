import { ImageResponse } from "next/og";

import { APP } from "@/lib/constants";

/**
 * Vignette de partage — ce que voient Slack, iMessage ou un aperçu de lien.
 *
 * Générée par code comme `apple-icon` : le signe reste défini à un seul
 * endroit. Pas de police personnalisée ici, Satori devrait alors télécharger
 * Fraunces à chaque rendu ; la pile système suffit pour une vignette.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${APP.name} — ${APP.tagline}`;

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="180" height="180">
  <path d="M13.5 51 C 22 51 29.5 46 34.5 36.5" fill="none" stroke="#fff" stroke-width="5.2" stroke-linecap="round"/>
  <circle cx="13.5" cy="51" r="4" fill="#fff"/>
  <g transform="translate(35 8) scale(0.95)" fill="#fff">
    <path d="M12 0c.6 5.6 5.8 10.8 11.4 11.4v1.2C17.8 13.2 12.6 18.4 12 24h-1.2C10.2 18.4 5 13.2-.6 12.6v-1.2C5 10.8 10.2 5.6 10.8 0Z"/>
  </g>
</svg>`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: "0 96px",
          backgroundImage: "linear-gradient(135deg, #fce7ef 0%, #ece3f7 50%, #dff4f1 100%)",
          color: "#2a2430",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 180,
            height: 180,
            borderRadius: 48,
            backgroundImage: "linear-gradient(135deg, #f295b6 0%, #a98ad4 48%, #45bcae 100%)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            width={180}
            height={180}
            alt=""
            src={`data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`}
          />
        </div>

        <div style={{ display: "flex", fontSize: 92, fontWeight: 700, marginTop: 48 }}>
          {APP.name}
        </div>
        <div style={{ display: "flex", fontSize: 42, marginTop: 12, color: "#6b6076" }}>
          {APP.tagline}
        </div>
      </div>
    ),
    size,
  );
}
