# LifeQuest — application mobile

Applications iOS et Android de LifeQuest, publiables sur l'App Store et le
Play Store.

## Principe

L'application est une coquille native [Capacitor 8](https://capacitorjs.com)
qui affiche le site de production, `https://lifequest.absoley.fr`. Les écrans,
les données, le moteur de priorisation et l'assistant sont **exactement ceux
du site** : LifeQuest repose sur des Server Components et des Server Actions,
qu'aucun export statique ne saurait embarquer, et dupliquer l'interface en
React Native la ferait diverger du web à chaque évolution.

```text
┌──────────── Application iOS / Android ────────────┐
│  Écran de lancement · barres système · haptique   │
│  bouton retour · navigateur intégré · rappel      │
│  ┌─────────────── WebView ───────────────────┐    │
│  │   https://lifequest.absoley.fr            │◀───┼── même code que le site
│  │   + window.Capacitor (pont natif)         │    │
│  └───────────────────────────────────────────┘    │
│  offline.html (embarquée) si le site est injoignable
└───────────────────────────────────────────────────┘
```

Ce que la coquille ajoute au site :

| Fonction | Où |
|---|---|
| Écran de lancement clair/sombre, masqué dès que le site est prêt | `ios/…/LaunchScreen.storyboard`, `android/…/values/styles.xml`, `NativeBridge` |
| Barre d'état accordée au thème, contenu sous l'encoche (`--safe-top`, `--safe-bottom`) | `NativeBridge`, `globals.css` |
| Retours haptiques : onglets, étape cochée, objectif atteint, badge | `src/lib/native.ts`, `src/lib/confetti.ts` |
| Bouton retour Android : ferme la fenêtre ouverte, puis recule, puis réduit l'app | `NativeBridge` |
| Glisser depuis le bord gauche pour revenir en arrière (iOS) | `SceneDelegate.swift` |
| Liens externes et pièces jointes dans le navigateur intégré (liens signés) | `NativeBridge`, `/api/lien-fichier` |
| Rappel quotidien par notification locale, vers le journal | `src/components/native/daily-reminder.tsx` |
| Page hors connexion aux couleurs de l'app, nouvelle tentative automatique | `www/offline.html` |
| Données rafraîchies au retour dans l'app, alerte hors connexion | `NativeBridge` |

Tout le code côté site passe par `isNativeApp()` : dans un navigateur, rien ne
change.

## Arborescence

```text
capacitor.config.ts        configuration (URL du site, plugins) — à la racine
mobile/
  www/                     index.html (requis) et offline.html, embarqués dans l'app
  ios/                     projet Xcode (Swift Package Manager, pas de CocoaPods)
  android/                 projet Android Studio (Gradle)
  scripts/generate-assets.mjs   icônes et écrans de lancement, depuis le logo
  store/                   icône 512 et bannière 1024×500 du Play Store
```

## Quand republier ?

| Changement | Action |
|---|---|
| Écran, texte, règle métier, correctif — tout `src/` | **Déployer le site.** L'app l'affiche au prochain lancement, sans passer par les stores. |
| `capacitor.config.ts`, `mobile/`, icônes, ajout ou mise à jour d'un plugin | Nouvelle version sur les deux stores. |

Un nouveau plugin natif utilisé par le site n'existe pas dans les versions
déjà installées : tester sa présence avec `Capacitor.isPluginAvailable("…")`
avant de l'appeler.

## Développer

Prérequis : Node 20+, **Xcode 26** avec la plateforme iOS, **Android Studio**
avec le SDK Android 36, et un **JDK 21**.

Android Studio embarque Java 25, que le Gradle de Capacitor 8 ne sait pas
lire (« Unsupported class file major version 69 »). Le projet fixe donc Java 21
pour Gradle (`android/gradle/gradle-daemon-jvm.properties`) ; il suffit qu'un
JDK 21 soit installé :

```bash
brew install openjdk@21
```

```bash
mkdir -p ~/Library/Java/JavaVirtualMachines && ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk ~/Library/Java/JavaVirtualMachines/openjdk-21.jdk
```

```bash
xcodebuild -downloadPlatform iOS
```

La commande ci-dessus installe la plateforme iOS (environ 8 Go) — sans elle,
Xcode refuse de compiler (« iOS 26.5 is not installed »).

```bash
npm run mobile:ios
```

```bash
npm run mobile:android
```

Ces deux commandes synchronisent la configuration puis ouvrent Xcode ou
Android Studio ; lancer ensuite sur un simulateur ou un appareil branché.

### Tester contre le serveur de ce Mac

L'app pointe par défaut sur la production. Pour essayer une modification du
site avant de la déployer, deux terminaux :

```bash
npm run mobile:serve
```

```bash
npm run mobile:local -- ios
```

Le premier construit le site et le sert sur le port 3210. Le second lance
l'app (Capacitor demande sur quel simulateur ou appareil) en la branchant sur
ce serveur : l'IP Wi-Fi du Mac pour iOS, `localhost` redirigé par `adb reverse`
pour Android (`npm run mobile:local -- android`).

Revenir à la production avant toute publication : `npx cap sync`.

### Sur un vrai iPhone

1. Xcode › Réglages › Comptes : ajouter ton identifiant Apple. Un compte
   gratuit suffit pour tester (l'app expire au bout de 7 jours, il suffit de
   la relancer depuis le Mac).
2. Ouvrir le projet (`npm run mobile:ios`), cible *App* › *Signing &
   Capabilities* › choisir ton équipe.
3. Brancher l'iPhone en USB, le déverrouiller et accepter « Se fier à cet
   ordinateur ».
4. Sur l'iPhone : Réglages › Confidentialité et sécurité › **Mode
   développeur** › activer (l'iPhone redémarre).
5. `npm run mobile:local -- ios` et choisir l'iPhone — ou le bouton ▶ d'Xcode.
6. Compte gratuit, premier lancement : Réglages › Général › VPN et gestion de
   l'appareil › faire confiance au certificat de développeur.

L'iPhone doit être sur le même Wi-Fi que le Mac, et accepter l'accès au
réseau local que l'app demande au premier lancement.

### Sur un vrai téléphone Android

1. Réglages › À propos du téléphone › toucher 7 fois **Numéro de build** pour
   activer les options pour les développeurs.
2. Réglages › Options pour les développeurs › activer le **Débogage USB**.
3. Brancher le téléphone en USB et accepter l'empreinte de l'ordinateur.
4. `npm run mobile:local -- android` et choisir le téléphone — ou le bouton ▶
   d'Android Studio.

Pas besoin du même Wi-Fi : le câble USB porte aussi la connexion au serveur.

**Déboguer** — Safari › Développement › (appareil) pour iOS, `chrome://inspect`
pour Android, sur une compilation Debug.

**Icônes** — après une retouche du logo : `npm run mobile:assets`.

## Publier sur le Play Store

### Une seule fois

1. **Compte développeur** Google Play (25 $, une fois).
2. **Clé d'envoi** — à conserver précieusement, hors du dépôt :

   ```bash
   keytool -genkeypair -v -keystore lifequest-upload.jks -alias lifequest -keyalg RSA -keysize 4096 -validity 10000
   ```

3. **`mobile/android/keystore.properties`** (ignoré par git) :

   ```properties
   storeFile=/chemin/absolu/lifequest-upload.jks
   storePassword=…
   keyAlias=lifequest
   keyPassword=…
   ```

4. Dans la Play Console : créer l'application **LifeQuest**, activer la
   *signature d'application par Google Play* (Google garde la clé de
   distribution, la vôtre ne sert qu'à l'envoi).

### Chaque version

1. Incrémenter `versionCode` (et `versionName`) dans `android/app/build.gradle`.
2. Construire l'AAB signé :

   ```bash
   cd mobile/android && ./gradlew bundleRelease
   ```

   Fichier produit : `mobile/android/app/build/outputs/bundle/release/app-release.aab`.
   Le workflow **Mobile** le produit aussi, signé si les secrets
   `LIFEQUEST_KEYSTORE_BASE64` (`base64 -i lifequest-upload.jks`),
   `LIFEQUEST_KEYSTORE_PASSWORD`, `LIFEQUEST_KEY_ALIAS` et
   `LIFEQUEST_KEY_PASSWORD` sont définis.
3. L'envoyer dans une piste de test, puis en production.

> **Compte personnel récent** : Google exige un test fermé avec au moins
> 12 testeurs pendant 14 jours avant la première mise en production.

## Publier sur l'App Store

### Une seule fois

1. **Apple Developer Program** (99 $/an).
2. Sur developer.apple.com, créer l'identifiant d'app `fr.absoley.lifequest`.
3. Dans App Store Connect, créer l'app **LifeQuest** (langue principale :
   français).
4. Dans Xcode (`npm run mobile:ios`) : cible *App* › *Signing & Capabilities* ›
   choisir l'équipe. La signature automatique fait le reste.

### Chaque version

1. Cible *App* › *General* : augmenter **Version** (1.0.0 → 1.1.0) et/ou
   **Build**.
2. *Product › Destination › Any iOS Device*, puis *Product › Archive*.
3. *Distribute App › App Store Connect* : la version arrive dans TestFlight,
   puis se soumet à la validation depuis App Store Connect.

## Fiches des stores

### Textes

- **Nom** : LifeQuest
- **Sous-titre** (App Store, 30 car.) : Tes rêves, étape par étape
- **Description courte** (Play Store, 80 car.) : Transforme tes rêves en itinéraire : objectifs, étapes, journal et coach.
- **Mots-clés** (App Store, 100 car.) : objectifs,bucket list,habitudes,journal,planning,motivation,rêves,coach,productivité
- **Catégorie** : Productivité
- **Description** :

  > LifeQuest t'accompagne sur plusieurs années pour réaliser tes plus grands
  > objectifs de vie. Découpe chaque rêve en étapes, laisse le moteur de
  > priorisation te dire ce qui est réalisable maintenant — selon ton âge, ton
  > budget, ton temps libre et la saison — et avance un peu chaque jour.
  >
  > • Objectifs détaillés : budget et épargne, étapes et sous-étapes, documents, personnes, dépendances
  > • Priorisation intelligente et objectif recommandé du jour
  > • Kanban, calendrier, frise de tes années
  > • Journal quotidien avec humeur et gratitude
  > • Assistant qui génère tes étapes, ton planning et ton budget
  > • XP, niveaux, badges et série quotidienne pour garder l'élan
  > • Rappel quotidien pour ne jamais casser ta série

### URLs

- **Politique de confidentialité** : `https://lifequest.absoley.fr/confidentialite`
- **Suppression du compte** (Play Store) : `https://lifequest.absoley.fr/confidentialite#suppression`
- Renseigner `CONTACT_EMAIL` dans `/srv/apps/lifequest/.env` : la page l'affiche
  comme contact, et les deux stores en demandent un.

### Visuels

- Icône Play Store : `store/play-icon-512.png` ; bannière : `store/play-feature-graphic.png`.
- Captures : iPhone 6,9″ (1320 × 2868), iPad 13″ (2064 × 2752) puisque l'app
  est universelle, téléphone Android (1080 × 1920 au moins). Le compte de
  démonstration fournit des écrans remplis.

### Questionnaires de confidentialité

Réponses conformes à ce que fait le code (détail dans `/confidentialite`) :

| Donnée | Collectée | Liée à l'utilisateur | Suivi publicitaire |
|---|---|---|---|
| Nom, adresse e-mail | oui | oui | non |
| Identifiant utilisateur | oui | oui | non |
| Photos, documents (pièces jointes, journal, avatar) | oui | oui | non |
| Autre contenu (objectifs, journal, conversations) | oui | oui | non |
| Autres données financières (épargne, budget saisis) | oui | oui | non |
| Données d'usage, diagnostics, localisation, contacts | **non** | — | — |

Finalité : fonctionnement de l'app uniquement. Chiffrement en transit : oui.
Suppression : dans l'app (*Paramètres › Supprimer mon compte*) et par l'URL
ci-dessus. Aucun partage à des fins publicitaires ; l'assistant transmet les
messages au fournisseur du modèle (Mistral AI ou Anthropic) en tant que
sous-traitant.

### Note pour la validation (App Review / Play)

> Pour explorer l'application sans créer de compte, touchez « Essayer le
> compte de démonstration » sur l'écran de connexion (lecture seule). Pour
> tester l'écriture et la suppression de compte, créez un compte depuis
> « Créer ma quête ».
>
> Fonctions natives : notifications locales (rappel quotidien, Paramètres),
> retours haptiques, navigation par geste et bouton retour, écran hors
> connexion, ouverture des documents dans le navigateur intégré.

## Choix à connaître

- **Identifiant** `fr.absoley.lifequest` : définitif une fois publié.
- **iOS 16.4 minimum** (iPhone 8 et X à jour, puis tous les suivants) : c'est
  ce qu'exigent Next.js 16 et Tailwind 4 pour le site affiché. En dessous,
  l'app s'installerait mais aucun bouton ne répondrait. Vérifier les
  navigateurs pris en charge avant chaque montée de version de ces deux outils :
  le site peut relever ce minimum sans nouvelle version de l'app.
- **Orientation** : portrait sur téléphone, toutes orientations sur iPad
  (exigé par le multitâche) et sur les grands écrans Android.
- **Pas de CocoaPods** : Capacitor 8 passe par Swift Package Manager ;
  `CapApp-SPM/Package.swift` est régénéré par `cap sync`.
- **Alarmes exactes** retirées du manifeste Android : le rappel quotidien n'en
  a pas besoin, et leur déclaration exige une justification sur le Play Store.
- **Sauvegarde Android** désactivée : les seules données locales sont les
  cookies de session.
