/**
 * Génère toutes les images natives à partir du signe LifeQuest.
 *
 *   npm run mobile:assets
 *
 * Le signe n'existe qu'en vectoriel (`public/logo.svg`, `components/shared/
 * logo.tsx`) : les PNG des deux plateformes en dérivent ici, une fois, et sont
 * versionnés. Retoucher le logo = retoucher le tracé ci-dessous, relancer.
 *
 * Produit :
 *   iOS      icône 1024 (sans transparence), logo et couleur de l'écran de lancement
 *   Android  icône adaptative (fond, avant-plan, monochrome), icônes héritées
 *            carrée et ronde, icône de l'écran de démarrage, icône de notification
 *   Stores   icône 512 et bannière 1024×500 de la fiche Play Store
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const MOBILE = join(dirname(fileURLToPath(import.meta.url)), "..");
const IOS_ASSETS = join(MOBILE, "ios/App/App/Assets.xcassets");
const ANDROID_RES = join(MOBILE, "android/app/src/main/res");
const STORE = join(MOBILE, "store");

/* ── Le signe ─────────────────────────────────────────────────────────────── */

const GRADIENT = `
  <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#f295b6"/>
    <stop offset="48%" stop-color="#a98ad4"/>
    <stop offset="100%" stop-color="#45bcae"/>
  </linearGradient>`;

/** Le chemin, son point de départ et l'étoile — dans une boîte de 64. */
const trace = (color = "#fff") => `
  <path d="M13.5 51 C 22 51 29.5 46 34.5 36.5" fill="none" stroke="${color}" stroke-width="5.2" stroke-linecap="round"/>
  <circle cx="13.5" cy="51" r="4" fill="${color}"/>
  <g transform="translate(35 8) scale(0.95)" fill="${color}">
    <path d="M12 0c.6 5.6 5.8 10.8 11.4 11.4v1.2C17.8 13.2 12.6 18.4 12 24h-1.2C10.2 18.4 5 13.2-.6 12.6v-1.2C5 10.8 10.2 5.6 10.8 0Z"/>
  </g>`;

const svg = (viewBox, body, size) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size}" height="${size}"><defs>${GRADIENT}</defs>${body}</svg>`,
  );

/** Pastille complète, coins arrondis comme `logo.svg`. */
const mark = (size) => svg("0 0 64 64", `<rect width="64" height="64" rx="17" fill="url(#b)"/>${trace()}`, size);

/** Dégradé plein cadre, sans coins : iOS et Android appliquent leur masque. */
const fullBleed = (size) => svg("0 0 64 64", `<rect width="64" height="64" fill="url(#b)"/>${trace()}`, size);

/** Fond de l'icône adaptative : le dégradé seul. */
const background = (size) => svg("0 0 64 64", `<rect width="64" height="64" fill="url(#b)"/>`, size);

/**
 * Pastille centrée dans une marge. `ratio` = côté de la pastille / côté total.
 * Sert à l'écran de démarrage Android 12+, dont l'icône doit tenir dans le
 * cercle central (192 dp sur 288).
 */
const paddedMark = (size, ratio) => {
  const total = 64 / ratio;
  const offset = (total - 64) / 2;
  return svg(
    `${-offset} ${-offset} ${total} ${total}`,
    `<rect width="64" height="64" rx="17" fill="url(#b)"/>${trace()}`,
    size,
  );
};

/**
 * Avant-plan de l'icône adaptative : le tracé seul, réduit pour tenir dans la
 * zone sûre (cercle de 66 dp sur 108). À 60/108 du cadre, l'étoile et le point
 * restent à l'intérieur de tous les masques — cercle, goutte, squircle.
 */
const adaptiveForeground = (size, color = "#fff") => {
  const total = 64 * (108 / 60);
  const offset = (total - 64) / 2;
  return svg(`${-offset} ${-offset} ${total} ${total}`, trace(color), size);
};

/** Icône de notification : silhouette blanche, recadrée sur le tracé. */
const notificationIcon = (size) => svg("7 5 54 54", trace(), size);

/** Icône ronde héritée (Android < 8) : même dessin, masque circulaire. */
const roundIcon = (size) =>
  svg(
    "0 0 64 64",
    `<clipPath id="c"><circle cx="32" cy="32" r="32"/></clipPath>
     <g clip-path="url(#c)"><rect width="64" height="64" fill="url(#b)"/>
       <g transform="translate(3.2 3.2) scale(0.9)">${trace()}</g></g>`,
    size,
  );

/* ── Écriture ─────────────────────────────────────────────────────────────── */

async function png(input, file, { opaque = false } = {}) {
  await mkdir(dirname(file), { recursive: true });
  let image = sharp(input);
  // L'App Store refuse une icône avec canal alpha.
  if (opaque) image = image.flatten({ background: "#a98ad4" }).removeAlpha();
  await image.png({ compressionLevel: 9 }).toFile(file);
}

async function json(file, data) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

/* ── iOS ──────────────────────────────────────────────────────────────────── */

async function ios() {
  const icon = join(IOS_ASSETS, "AppIcon.appiconset");
  await png(fullBleed(1024), join(icon, "AppIcon-512@2x.png"), { opaque: true });

  // Écran de lancement : couleur de fond (claire/sombre) et pastille centrée,
  // au lieu d'une image plein écran figée en thème clair.
  await rm(join(IOS_ASSETS, "Splash.imageset"), { recursive: true, force: true });

  const logo = join(IOS_ASSETS, "LaunchLogo.imageset");
  await png(mark(112), join(logo, "launch-logo.png"));
  await png(mark(224), join(logo, "launch-logo@2x.png"));
  await png(mark(336), join(logo, "launch-logo@3x.png"));
  await json(join(logo, "Contents.json"), {
    images: [
      { idiom: "universal", filename: "launch-logo.png", scale: "1x" },
      { idiom: "universal", filename: "launch-logo@2x.png", scale: "2x" },
      { idiom: "universal", filename: "launch-logo@3x.png", scale: "3x" },
    ],
    info: { author: "xcode", version: 1 },
  });

  const rgb = (hex) => ({
    "color-space": "srgb",
    components: {
      red: `0x${hex.slice(1, 3)}`,
      green: `0x${hex.slice(3, 5)}`,
      blue: `0x${hex.slice(5, 7)}`,
      alpha: "1.000",
    },
  });
  await json(join(IOS_ASSETS, "LaunchBackground.colorset/Contents.json"), {
    colors: [
      { idiom: "universal", color: rgb("#FDFBF9") },
      {
        idiom: "universal",
        appearances: [{ appearance: "luminosity", value: "dark" }],
        color: rgb("#17131D"),
      },
    ],
    info: { author: "xcode", version: 1 },
  });
}

/* ── Android ──────────────────────────────────────────────────────────────── */

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

async function android() {
  // Restes du gabarit Capacitor, remplacés par les ressources ci-dessous.
  for (const dir of ["drawable", "drawable-v24"]) {
    await rm(join(ANDROID_RES, dir, "ic_launcher_background.xml"), { force: true });
    await rm(join(ANDROID_RES, dir, "ic_launcher_foreground.xml"), { force: true });
  }
  await rm(join(ANDROID_RES, "drawable/splash.png"), { force: true });
  for (const orientation of ["port", "land"]) {
    for (const density of Object.keys(DENSITIES)) {
      await rm(join(ANDROID_RES, `drawable-${orientation}-${density}`), { recursive: true, force: true });
    }
  }

  for (const [density, scale] of Object.entries(DENSITIES)) {
    const mipmap = join(ANDROID_RES, `mipmap-${density}`);
    const drawable = join(ANDROID_RES, `drawable-${density}`);
    const px = (dp) => Math.round(dp * scale);

    await png(mark(px(48)), join(mipmap, "ic_launcher.png"));
    await png(roundIcon(px(48)), join(mipmap, "ic_launcher_round.png"));
    await png(background(px(108)), join(mipmap, "ic_launcher_background.png"));
    await png(adaptiveForeground(px(108)), join(mipmap, "ic_launcher_foreground.png"));

    await png(paddedMark(px(288), 0.5), join(drawable, "splash_icon.png"));
    await png(notificationIcon(px(24)), join(drawable, "ic_stat_lifequest.png"));
  }
}

/* ── Fiches des stores ────────────────────────────────────────────────────── */

async function store() {
  await png(fullBleed(512), join(STORE, "play-icon-512.png"), { opaque: true });

  // Bannière Play Store (1024×500) : dégradé de marque, pastille, nom et promesse.
  const banner = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fce4ec"/>
        <stop offset="50%" stop-color="#ece4f7"/>
        <stop offset="100%" stop-color="#dcf8f4"/>
      </linearGradient>
      ${GRADIENT}
    </defs>
    <rect width="1024" height="500" fill="url(#bg)"/>
    <g transform="translate(96 146) scale(3.25)">
      <rect width="64" height="64" rx="17" fill="url(#b)"/>${trace()}
    </g>
    <text x="358" y="236" font-family="Georgia, 'Times New Roman', serif" font-size="84" font-weight="600" fill="#2a2430">LifeQuest</text>
    <text x="362" y="300" font-family="Helvetica, Arial, sans-serif" font-size="32" fill="#6b6076">Transforme tes rêves en itinéraire.</text>
  </svg>`);
  await png(banner, join(STORE, "play-feature-graphic.png"), { opaque: true });
}

await ios();
await android();
await store();
console.log("Images natives générées.");
