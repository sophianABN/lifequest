"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { SystemBars, SystemBarsStyle } from "@capacitor/core";
import { toast } from "sonner";

import { isNativeApp, nativePlatform, openInAppBrowser, openStoredFile } from "@/lib/native";

/** Absence au-delà de laquelle un retour dans l'application recharge les données. */
const REFRESH_AFTER_MS = 60_000;

/** Écrans d'où le bouton retour Android quitte l'application au lieu de reculer. */
const ROOT_PATHS = ["/", "/connexion", "/inscription"];

/** `viewport` du layout racine, sans zoom possible. */
const LOCKED_VIEWPORT = "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover";

/**
 * Comportements propres à l'application mobile. Ne rend rien, et ne fait
 * rien dans un navigateur.
 *
 * - masque l'écran de démarrage une fois le site hydraté ;
 * - accorde la barre d'état au thème clair ou sombre ;
 * - bouton retour Android : ferme d'abord la fenêtre ouverte, puis recule ;
 * - liens externes et fichiers dans le navigateur intégré ;
 * - données rafraîchies au retour dans l'application ;
 * - avertissement hors connexion ;
 * - ouverture de la bonne page depuis une notification.
 */
export function NativeBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  // Lu par les écouteurs natifs, enregistrés une seule fois.
  const pathnameRef = React.useRef(pathname);
  React.useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  React.useEffect(() => {
    if (!isNativeApp()) return;

    const root = document.documentElement;
    root.classList.add("native-app", `native-${nativePlatform()}`);

    const cleanups: Array<() => void> = [];
    let disposed = false;

    // Une application ne zoome pas : ni au pincement, ni à la mise au point
    // d'un champ (iOS agrandit tout champ dont la police fait moins de 16 px).
    // Next réécrit la balise à chaque navigation : on la surveille.
    const lockViewport = () => {
      const meta = document.querySelector('meta[name="viewport"]');
      if (meta && meta.getAttribute("content") !== LOCKED_VIEWPORT) {
        meta.setAttribute("content", LOCKED_VIEWPORT);
      }
    };
    lockViewport();
    const viewportObserver = new MutationObserver(lockViewport);
    viewportObserver.observe(document.head, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["content"],
    });
    cleanups.push(() => viewportObserver.disconnect());

    /* ── Liens ──────────────────────────────────────────────────────────── */
    // En phase de bouillonnement, après les gestionnaires de React : un <Link>
    // interne a déjà appelé `preventDefault()` et on ne le touche pas.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      // mailto:, tel:… : le système ouvre l'application concernée.
      if (url.protocol !== "http:" && url.protocol !== "https:") return;

      if (url.origin !== window.location.origin) {
        event.preventDefault();
        void openInAppBrowser(url.href);
      } else if (url.pathname.startsWith("/api/fichiers/")) {
        event.preventDefault();
        openStoredFile(url.pathname).catch(() => toast.error("Impossible d'ouvrir ce fichier."));
      }
    };
    document.addEventListener("click", onClick);
    cleanups.push(() => document.removeEventListener("click", onClick));

    void (async () => {
      const [{ App }, { SplashScreen }, { Network }, { LocalNotifications }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/splash-screen"),
        import("@capacitor/network"),
        import("@capacitor/local-notifications"),
      ]);
      if (disposed) return;

      await SplashScreen.hide({ fadeOutDuration: 250 });

      let pausedAt = 0;
      let offline = false;

      const listeners = await Promise.all([
        /* ── Bouton retour (Android) ───────────────────────────────────── */
        App.addListener("backButton", ({ canGoBack }) => {
          // Fenêtre, tiroir, menu ou palette ouverts : Radix les ferme sur Échap.
          const overlay = document.querySelector(
            '[role="dialog"][data-state="open"], [role="menu"][data-state="open"], [role="listbox"][data-state="open"], [data-radix-popper-content-wrapper]',
          );
          if (overlay) {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
            return;
          }
          if (ROOT_PATHS.includes(pathnameRef.current)) {
            void App.minimizeApp();
          } else if (canGoBack) {
            window.history.back();
          } else {
            router.push("/");
          }
        }),

        /* ── Retour dans l'application ─────────────────────────────────── */
        // Série, compte à rebours, objectif du jour : tout dépend de la date,
        // et l'application peut rester des jours en arrière-plan.
        App.addListener("pause", () => {
          pausedAt = Date.now();
        }),
        App.addListener("resume", () => {
          if (pausedAt && Date.now() - pausedAt > REFRESH_AFTER_MS) router.refresh();
        }),

        /* ── Réseau ────────────────────────────────────────────────────── */
        Network.addListener("networkStatusChange", ({ connected }) => {
          if (!connected && !offline) {
            offline = true;
            toast.warning("Hors connexion", {
              id: "reseau",
              duration: Infinity,
              description: "Tes modifications ne seront pas enregistrées avant le retour du réseau.",
            });
          } else if (connected && offline) {
            offline = false;
            toast.dismiss("reseau");
            toast.success("De retour en ligne", { duration: 2000 });
            router.refresh();
          }
        }),

        /* ── Notification touchée ──────────────────────────────────────── */
        LocalNotifications.addListener("localNotificationActionPerformed", ({ notification }) => {
          const url: unknown = notification.extra?.url;
          if (typeof url === "string" && url.startsWith("/")) router.push(url);
        }),
      ]);

      if (disposed) listeners.forEach((l) => void l.remove());
      else cleanups.push(() => listeners.forEach((l) => void l.remove()));
    })();

    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [router]);

  // Texte clair sur fond sombre, et inversement.
  React.useEffect(() => {
    if (!isNativeApp() || !resolvedTheme) return;
    void SystemBars.setStyle({
      style: resolvedTheme === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
    });
  }, [resolvedTheme]);

  return null;
}
