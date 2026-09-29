import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Application mobile LifeQuest (iOS et Android).
 *
 * L'application native est une coquille qui charge le site de production :
 * LifeQuest repose sur des Server Components et des Server Actions, qu'aucun
 * export statique ne peut embarquer. Chaque écran, chaque règle métier et
 * chaque correctif restent donc communs au web et aux deux stores — une mise
 * en production du site met à jour l'application sans nouvelle soumission.
 *
 * Ce que la coquille ajoute par-dessus : écran de démarrage, barres système
 * accordées au thème, retours haptiques, bouton retour Android, liens externes
 * dans un navigateur intégré, page hors-ligne et rappel quotidien local. Tout
 * cela est piloté depuis le site par `src/components/native/native-bridge.tsx`.
 *
 * Pour tester contre un serveur de développement du réseau local :
 *   LIFEQUEST_APP_URL=http://192.168.1.54:3000 npx cap run ios
 * (penser à renseigner `DEV_ORIGINS` dans `.env`, voir `next.config.ts`).
 */
const APP_URL = process.env.LIFEQUEST_APP_URL ?? "https://lifequest.absoley.fr";

const config: CapacitorConfig = {
  appId: "fr.absoley.lifequest",
  appName: "LifeQuest",
  webDir: "mobile/www",

  // Pas de `backgroundColor` ici : une couleur fixe serait claire en mode
  // sombre. Le fond de la WebView suit le thème système côté natif
  // (`LaunchBackground` sur iOS, `app_background` sur Android).

  // Distingue l'application d'un navigateur mobile dans les journaux du
  // serveur. Côté interface, la détection passe par `isNativeApp()`.
  appendUserAgent: "LifeQuestApp",

  server: {
    url: APP_URL,
    // Servie depuis l'application quand le site est injoignable.
    errorPath: "offline.html",
    cleartext: APP_URL.startsWith("http://"),
  },

  ios: {
    path: "mobile/ios",
    // Le contenu passe sous la barre d'état ; l'interface compense avec
    // `env(safe-area-inset-*)`, comme une application native.
    contentInset: "never",
    // L'aperçu d'un lien par appui long est un geste de navigateur : dans
    // l'application, un appui long sur une carte ne doit rien ouvrir.
    allowsLinkPreview: false,
    preferredContentMode: "mobile",
  },

  android: {
    path: "mobile/android",
  },

  plugins: {
    SplashScreen: {
      // Masqué par le site dès qu'il est hydraté (`NativeBridge`), ou par
      // `offline.html` : l'écran de démarrage couvre le chargement au lieu
      // d'une page vide. La durée n'est qu'un plafond — sans masquage
      // automatique, un site qui planterait avant l'hydratation laisserait
      // l'écran affiché pour toujours (sur Android, la WebView n'est même pas
      // dessinée tant qu'il est là).
      launchAutoHide: true,
      launchShowDuration: 10000,
      // Pas de couleur imposée : l'écran de démarrage reprend le storyboard
      // iOS et le thème Android, tous deux déclinés en clair et en sombre.
      androidScaleType: "FIT_XY",
      showSpinner: false,
      launchFadeOutDuration: 250,
    },
    SystemBars: {
      // Injecte `--safe-area-inset-*` : les anciennes WebView Android ne
      // renseignent pas `env(safe-area-inset-*)`.
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
    },
    Keyboard: {
      resizeOnFullScreen: true,
      autoBackdropColor: "dom",
    },
    LocalNotifications: {
      smallIcon: "ic_stat_lifequest",
      iconColor: "#E4739C",
      // Pas de pastille sur l'icône : un rappel n'est pas une tâche en retard.
      presentationOptions: ["banner", "list", "sound"],
    },
  },
};

export default config;
