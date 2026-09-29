import { Capacitor } from "@capacitor/core";

/**
 * Application mobile (iOS / Android).
 *
 * Le même site sert le navigateur et l'application : la coquille native
 * (`capacitor.config.ts`, dossier `mobile/`) charge la production et injecte
 * `window.Capacitor` avant tout script. Ce module est le seul point d'entrée
 * vers les API natives ; chaque fonction ne fait rien hors de l'application,
 * les appelants n'ont donc jamais à tester la plateforme eux-mêmes.
 *
 * Les plugins sont importés à la demande : un visiteur web ne télécharge pas
 * leur code.
 */

/** Vrai dans l'application, faux dans un navigateur et au rendu serveur. */
export function isNativeApp() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function nativePlatform() {
  return isNativeApp() ? (Capacitor.getPlatform() as "ios" | "android") : "web";
}

type HapticKind = "selection" | "light" | "medium" | "heavy" | "success" | "warning";

/**
 * Retour haptique. Indépendant de `prefers-reduced-motion` : ce réglage vise
 * les animations, pas la vibration, que l'utilisateur coupe dans le système.
 */
export async function haptic(kind: HapticKind = "light") {
  if (!isNativeApp()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
    switch (kind) {
      case "selection":
        await Haptics.selectionChanged();
        return;
      case "success":
        await Haptics.notification({ type: NotificationType.Success });
        return;
      case "warning":
        await Haptics.notification({ type: NotificationType.Warning });
        return;
      default:
        await Haptics.impact({
          style: { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy }[kind],
        });
    }
  } catch {
    // Appareil sans moteur haptique : rien à signaler.
  }
}

/**
 * Ouvre une URL externe dans le navigateur intégré (Safari View Controller,
 * Custom Tabs) : l'utilisateur reste dans l'application et revient d'un geste.
 */
export async function openInAppBrowser(url: string) {
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url, presentationStyle: "popover" });
}

/**
 * Ouvre un fichier du stockage (`/api/fichiers/…`) dans le navigateur intégré.
 *
 * Celui-ci ne partage pas les cookies de l'application : il reçoit donc une
 * URL signée de courte durée plutôt que l'URL de session. C'est aussi lui qui
 * sait afficher un PDF et proposer « Enregistrer dans Fichiers » — ce qu'une
 * WebView Android ne fait pas.
 */
export async function openStoredFile(path: string) {
  const response = await fetch(`/api/lien-fichier?chemin=${encodeURIComponent(path)}`);
  if (!response.ok) throw new Error("Fichier introuvable");
  const { url } = (await response.json()) as { url: string };
  await openInAppBrowser(new URL(url, window.location.origin).href);
}
