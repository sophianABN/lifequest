/**
 * Lance l'application sur un simulateur, un émulateur ou un vrai téléphone,
 * branchée sur le serveur LifeQuest de ce Mac plutôt que sur la production.
 *
 *   npm run mobile:serve                 (dans un premier terminal)
 *   npm run mobile:local -- ios          (ou android)
 *   npm run mobile:local -- ios --target <id>   (appareil précis, voir `npx cap run ios --list`)
 *
 * Adresse du serveur vue par l'application :
 *   iOS      l'IP du Mac sur le réseau local — le simulateur y accède comme
 *            un iPhone réel, qui doit être sur le même Wi-Fi ;
 *   Android  `localhost`, redirigé vers le Mac par `adb reverse` — émulateur
 *            ou téléphone branché en USB, sans condition de réseau.
 *
 * Revenir à la production : `npx cap sync` (sans variable).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { networkInterfaces } from "node:os";

const PORT = 3210;
const [platform, ...rest] = process.argv.slice(2);

if (platform !== "ios" && platform !== "android") {
  console.error("Usage : npm run mobile:local -- ios|android [--target <id>]");
  process.exit(1);
}

/**
 * IP du Mac sur le Wi-Fi ou l'Ethernet (`en0`, `en1`…). Les ponts de Docker et
 * des machines virtuelles (`bridge100`…) sont listés avant et ne sont pas
 * joignables depuis un téléphone.
 */
function lanAddress() {
  const physical = Object.entries(networkInterfaces())
    .filter(([name]) => /^en\d+$/.test(name))
    .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }));
  for (const [, addresses] of physical) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  return "localhost";
}

let host = "localhost";
if (platform === "ios") {
  host = lanAddress();
} else {
  // Chaque appareil connecté (émulateur ou téléphone USB) voit le port du Mac
  // sur son propre `localhost`.
  const devices = execFileSync("adb", ["devices"], { encoding: "utf8" })
    .split("\n")
    .slice(1)
    .map((line) => line.split("\t"))
    .filter(([, state]) => state === "device")
    .map(([serial]) => serial);
  if (devices.length === 0) {
    console.error("Aucun appareil Android : démarre un émulateur ou branche un téléphone (débogage USB activé).");
    process.exit(1);
  }
  for (const serial of devices) {
    execFileSync("adb", ["-s", serial, "reverse", `tcp:${PORT}`, `tcp:${PORT}`]);
  }
}

const url = `http://${host}:${PORT}`;
console.log(`\nL'application chargera ${url}\n`);

const result = spawnSync("npx", ["cap", "run", platform, ...rest], {
  stdio: "inherit",
  env: { ...process.env, LIFEQUEST_APP_URL: url },
});

console.log("\nRappel : `npx cap sync` rebranche l'application sur la production avant une publication.");
process.exit(result.status ?? 1);
