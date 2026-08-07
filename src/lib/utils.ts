import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Fusionne des classes Tailwind en résolvant les conflits (`p-2 p-4` → `p-4`). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Dates ───────────────────────────────────────────────────────────────────

/** Ramène une date à minuit — les entrées de journal sont indexées par jour. */
export function startOfDay(date: Date | string) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Formate une date en `YYYY-MM-DD` **dans le fuseau local**.
 *
 * `toISOString().slice(0, 10)` semble équivalent mais décale d'un jour à
 * l'est de Greenwich : minuit à Paris est 22 h la veille en UTC. Toute date
 * qui devient une chaîne (champ `<input type="date">`, clé de heatmap,
 * paramètre d'URL) doit passer par ici.
 */
export function toDateInput(date: Date | string) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function daysBetween(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

export function getAge(birthDate: Date | string | null | undefined, at: Date = new Date()) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  let age = at.getFullYear() - b.getFullYear();
  const m = at.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < b.getDate())) age--;
  return age;
}

/** Âge décimal (23.7 ans) — utilisé par le moteur d'intelligence et la timeline. */
export function getExactAge(birthDate: Date | string, at: Date = new Date()) {
  const b = new Date(birthDate);
  return (at.getTime() - b.getTime()) / (365.2425 * 86_400_000);
}

/** « dans 3 mois », « il y a 2 jours » — format court et humain. */
export function relativeTime(date: Date | string, from: Date = new Date()) {
  const target = new Date(date);
  const diff = target.getTime() - from.getTime();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["week", 604_800_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "à l'instant";
}

export function formatDate(date: Date | string | null | undefined, style: "short" | "long" | "month" = "short") {
  if (!date) return "—";
  const d = new Date(date);
  if (style === "long") {
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }
  if (style === "month") {
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/** Décompose une durée en années / mois / jours pour les comptes à rebours. */
export function countdownParts(target: Date | string, from: Date = new Date()) {
  const total = Math.max(0, daysBetween(from, new Date(target)));
  return {
    totalDays: total,
    years: Math.floor(total / 365),
    months: Math.floor((total % 365) / 30),
    days: Math.floor((total % 365) % 30),
    weeks: Math.floor(total / 7),
  };
}

// ─── Formats ─────────────────────────────────────────────────────────────────

export function formatMoney(amount: number | null | undefined) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompact(n: number) {
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatDuration(hours: number | null | undefined) {
  if (!hours) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${Math.round(hours)} h`;
  const days = Math.round(hours / 8); // journées de travail effectif
  if (days < 30) return `${days} j`;
  return `${Math.round(days / 22)} mois`;
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Tirage pseudo-aléatoire *déterministe* à partir d'une graine.
 * Utilisé pour la citation du jour : la même journée renvoie la même citation,
 * sans avoir à la stocker en base.
 */
export function seededPick<T>(items: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return items[Math.abs(hash) % items.length];
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`;
}
