# LifeQuest

> Transforme tes rêves en itinéraire.

Application d'accompagnement long terme pour réaliser ses plus grands objectifs
de vie — pensée pour tenir plusieurs années, pas quelques semaines. Un mélange
de Notion, Todoist, Duolingo, Google Calendar, Habitica et Trello, augmenté
d'un moteur de priorisation et d'un assistant.

L'architecture complète est documentée dans [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Démarrage

Prérequis : **Node 20+** et **Docker** (pour PostgreSQL).

```bash
cp .env.example .env      # puis générer AUTH_SECRET (voir plus bas)
npm install
npm run setup             # démarre PostgreSQL, applique le schéma et charge les données
npm run dev
```

L'application est disponible sur http://localhost:3000.

**Compte de démonstration** — le bouton « Essayer le compte de démonstration »
sur l'écran de connexion, ou :

```
arwa@lifequest.app / lifequest
```

Il contient les 25 objectifs de la quête, leurs étapes, un an d'historique
d'XP, 34 entrées de journal, des badges déjà débloqués et un calendrier rempli.

### Générer `AUTH_SECRET`

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (génère le client Prisma) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint |
| `npm run db:up` | Démarre PostgreSQL via Docker |
| `npm run db:migrate` | Crée et applique une migration |
| `npm run db:seed` | Recharge les données de démonstration |
| `npm run db:studio` | Ouvre Prisma Studio |
| `npm run db:reset` | Réinitialise la base et rejoue le seed |

---

## Assistant IA — optionnel

L'assistant fonctionne **sans clé API**. Chaque capacité (générer des étapes,
estimer un budget, produire un planning, répondre à une question) possède une
implémentation déterministe dans `src/lib/ai/generators.ts`, alimentée par le
moteur d'intelligence. L'interface affiche alors un badge « mode hors-ligne ».

Deux fournisseurs sont câblés. Renseigner **l'une** des clés dans `.env` :

```
MISTRAL_API_KEY="..."          # prioritaire ; MISTRAL_MODEL est facultatif
ANTHROPIC_API_KEY="sk-ant-..."
```

Mistral passe par l'API compatible OpenAI (`src/lib/ai/mistral.ts`, sans SDK),
Anthropic par son SDK officiel. Le repli reste actif en cas d'erreur réseau, de
quota atteint ou de refus du modèle : l'utilisateur obtient toujours une
réponse.

---

## Stockage des fichiers — optionnel

Les pièces jointes et la photo de profil acceptent un vrai fichier dès qu'un
stockage compatible S3 est configuré (`S3_ENDPOINT`, `S3_BUCKET`,
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`). `docker compose up -d` démarre un
MinIO local et crée le bucket ; en production, MinIO ou Cloudflare R2 font
l'affaire.

Le bucket reste **privé**. Les octets transitent par l'application dans les deux
sens : `/api/uploads` pour l'écriture, `/api/fichiers/<clé>` pour la lecture.
La clé est préfixée par l'identifiant du propriétaire, ce qui rend
l'autorisation triviale — et évite toute configuration CORS sur le bucket.
Sans configuration, les champs retombent sur une URL externe.

---

## Déploiement

Trois workflows GitHub Actions : `ci.yml` (types, lint, build, migrations
rejouées, seed), `image.yml` (publie `ghcr.io/sophianabn/lifequest:sha-<commit>`
à chaque push sur `main`) et `deploy.yml` (déclenchement manuel).

L'application tourne sur le VPS derrière le Traefik partagé, avec sa propre base
PostgreSQL non exposée. Procédure complète, invariants et retour arrière :
[`deploy/README.md`](deploy/README.md).

---

## Ce qui est implémenté

| Domaine | Détail |
|---|---|
| **Tableau de bord** | Profil, âge, compte à rebours, progression globale, citation du jour, objectif recommandé, objectifs prioritaires et presque terminés, à venir, dernières réussites, badges, courbe d'XP |
| **Objectifs** | 25 champs (budget, temps, pays, personnes, difficulté, dépendances…), recherche instantanée, 5 filtres combinables, 5 tris, vues grille et liste |
| **Fiche objectif** | Étapes et sous-étapes en glisser-déposer, checklist, budget avec suivi d'épargne, documents, commentaires, personnes, graphe de dépendances, journal lié, panneau d'analyse |
| **Intelligence** | Score 0-100 par objectif à partir de l'urgence, du budget, du temps libre, de l'élan, de la saison et de la priorité ; détection des blocages durs et souples ; prochaines actions conseillées |
| **Kanban** | 5 colonnes, glisser-déposer optimiste, confettis à la complétion |
| **Calendrier** | Vues jour / semaine / mois / année, déplacement par glisser-déposer (l'étape liée suit), création rapide |
| **Timeline** | Frise par âge, de l'année en cours à l'échéance de la quête |
| **Statistiques** | 12 indicateurs, XP cumulée, réalisations par année, répartition par statut, équilibre par catégorie, financement, humeur, heatmap d'activité sur un an |
| **Journal** | Une entrée par jour, humeur, gratitude, objectif lié, historique |
| **Gamification** | XP, 10 niveaux titrés, 25 badges à 4 niveaux de rareté, série quotidienne, confettis |
| **Assistant** | Conversation en streaming, historique persistant (reprise, renommage, suppression), génération d'étapes proposées avant insertion, analyse de budget, planning hebdomadaire |
| **Fichiers** | Téléversement vers un stockage compatible S3 (MinIO, R2…), bucket privé servi par l'application, photo de profil et pièces jointes |
| **Transverse** | Recherche globale ⌘K, notifications, mode clair/sombre, responsive, accessibilité (vue tableau sous chaque graphique, libellés ARIA, `prefers-reduced-motion`) |

---

## Notes techniques

- **Prisma 7** : l'URL de connexion vit dans `prisma.config.ts` et le client
  reçoit un adaptateur `pg` (voir `src/lib/prisma.ts`).
- **`src/proxy.ts`** remplace `middleware.ts` (convention Next.js 16) et
  n'embarque que la configuration Auth.js compatible Edge.
- **Dates** : toute conversion d'une date en chaîne `YYYY-MM-DD` passe par
  `toDateInput()`. `toISOString().slice(0, 10)` décale d'un jour à l'est de
  Greenwich, minuit à Paris étant 22 h la veille en UTC.
- **Graphiques** : palette dédiée validée pour le contraste et la vision des
  couleurs (`src/lib/charts.ts`), distincte des pastels de la marque, trop
  clairs pour porter de la donnée. Les barres horizontales sont rendues en CSS.
