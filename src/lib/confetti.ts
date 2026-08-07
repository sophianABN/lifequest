import confetti from "canvas-confetti";

import { COLOR_HEX } from "@/lib/constants";

const BRAND_COLORS = Object.values(COLOR_HEX);
const GOLD_COLORS = ["#e3b778", "#d19a4e", "#f4ddb1", "#fdf9f0"];

/** Respecte la préférence système : pas d'animation intrusive si elle est désactivée. */
function motionAllowed() {
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Petite explosion — une étape cochée. */
export function celebrateStep(origin?: { x: number; y: number }) {
  if (!motionAllowed()) return;
  confetti({
    particleCount: 40,
    spread: 55,
    startVelocity: 28,
    scalar: 0.7,
    ticks: 120,
    colors: BRAND_COLORS,
    origin: origin ?? { x: 0.5, y: 0.6 },
    disableForReducedMotion: true,
  });
}

/** Célébration complète — un objectif terminé. */
export function celebrateGoal() {
  if (!motionAllowed()) return;
  const end = Date.now() + 1400;

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
      colors: BRAND_COLORS,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
      colors: BRAND_COLORS,
      disableForReducedMotion: true,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  confetti({
    particleCount: 140,
    spread: 100,
    startVelocity: 45,
    origin: { y: 0.55 },
    colors: BRAND_COLORS,
    disableForReducedMotion: true,
  });
}

/** Feu d'artifice doré — l'objectif final, ou un badge légendaire. */
export function celebrateFinal() {
  if (!motionAllowed()) return;
  const duration = 4000;
  const end = Date.now() + duration;

  (function fireworks() {
    const timeLeft = end - Date.now();
    if (timeLeft <= 0) return;

    confetti({
      particleCount: 3,
      startVelocity: 0,
      ticks: 200,
      gravity: 0.4,
      scalar: 1.2,
      shapes: ["star"],
      colors: GOLD_COLORS,
      origin: { x: Math.random(), y: Math.random() * 0.5 },
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 30,
      spread: 360,
      startVelocity: 30,
      origin: { x: Math.random(), y: Math.random() * 0.6 },
      colors: [...GOLD_COLORS, ...BRAND_COLORS],
      disableForReducedMotion: true,
    });

    setTimeout(fireworks, 320);
  })();
}

/** Pluie d'étoiles discrète — déblocage de badge. */
export function celebrateBadge() {
  if (!motionAllowed()) return;
  confetti({
    particleCount: 60,
    spread: 80,
    shapes: ["star"],
    scalar: 1.1,
    colors: GOLD_COLORS,
    origin: { y: 0.4 },
    disableForReducedMotion: true,
  });
}
