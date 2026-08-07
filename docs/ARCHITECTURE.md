# LifeQuest — Architecture

> Application d'accompagnement long terme (plusieurs années) pour réaliser ses plus grands
> objectifs de vie. Mélange Notion / Todoist / Duolingo / Google Calendar / Habitica / Trello,
> augmenté d'un moteur de priorisation et d'un assistant IA.

---

## 1. Choix techniques

| Domaine | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | Server Components = moins de JS envoyé, Server Actions = mutations typées sans couche API redondante. |
| Langage | **TypeScript strict** | Le domaine est riche (objectifs, étapes, scoring) : le typage est la première documentation. |
| Style | **Tailwind CSS v4** (config CSS-first, `@theme`) | Design system exprimé en tokens CSS → un seul endroit pour la charte, dark mode gratuit. |
| Composants | **shadcn/ui** (Radix + CVA, code possédé dans `components/ui`) | Accessibilité Radix + liberté totale sur le style premium voulu. |
| Animations | **Motion** (ex-Framer Motion) | Transitions de page, listes, compteurs, confettis. |
| ORM / DB | **Prisma + PostgreSQL** | Relations profondes (objectif → étapes → sous-étapes), migrations versionnées. |
| Auth | **Auth.js v5 (NextAuth)** + Prisma Adapter | Sessions JWT, credentials + extensible OAuth. |
| Formulaires | **React Hook Form + Zod** | Un seul schéma Zod partagé client ↔ serveur (validation + types). |
| Data client | **TanStack Query** | Cache, optimistic updates (drag & drop Kanban / calendrier). |
| Graphiques | **Recharts** | Courbes, aires, radar, heatmap custom. |
| Drag & drop | **dnd-kit** | Accessible clavier, plus léger que react-beautiful-dnd, maintenu. |
| IA | **Anthropic SDK (claude-sonnet-5)** + fallback déterministe | L'app reste 100 % fonctionnelle sans clé API grâce au moteur de règles. |
| Icônes | **Lucide** | Cohérent, fin, élégant. |

### Principes d'architecture

1. **Server-first** : lecture des données dans des Server Components via `src/server/queries`.
2. **Mutations = Server Actions** dans `src/server/actions`, chacune : `auth() → zod parse → prisma → recalcul progression/XP → revalidatePath`.
3. **Le domaine est isolé** : `src/lib/intelligence` (scoring), `src/lib/gamification` (XP/badges/streak) sont des fonctions pures, testables, sans Prisma ni React.
4. **L'IA n'est jamais un point de défaillance** : chaque capacité IA a une implémentation déterministe de repli.
5. **Un composant = une responsabilité**, `components/ui` ne connaît rien du domaine.

---

## 2. Arborescence

```
prisma/
  schema.prisma            # modèle de données complet
  seed.ts                  # utilisateur démo + 25 objectifs + badges + citations
  seed-data/               # données statiques (objectifs, badges, citations)

src/
  proxy.ts                 # protection des routes (ex-`middleware.ts`, Next 16)
  app/
    (auth)/                # login, register — layout plein écran
    (app)/                 # layout applicatif : sidebar + topbar + palette de commandes
      page.tsx             # Tableau de bord
      objectifs/           # liste + [slug] fiche détaillée
      kanban/  calendrier/  timeline/  analytics/
      journal/  badges/  assistant/  parametres/
    api/
      auth/[...nextauth]/  # Auth.js
      ai/chat/             # streaming assistant
      ai/generate-steps/   # génération d'étapes / planning / budget
  components/
    ui/                    # primitives shadcn (button, card, dialog, ...)
    layout/                # sidebar, topbar, nav mobile, theme toggle, command palette
    dashboard/ goals/ steps/ kanban/ calendar/ timeline/
    analytics/ journal/ gamification/ shared/
  lib/
    prisma.ts auth.ts utils.ts constants.ts
    validations/           # schémas Zod partagés
    intelligence/          # moteur de score, faisabilité, prochaines actions
    gamification/          # XP, niveaux, badges, streak
    ai/                    # client Anthropic, prompts, outils, fallbacks
  server/
    queries/               # lectures (Server Components)
    actions/               # écritures (Server Actions)
  hooks/  types/  providers/
```

---

## 3. Modèle de données (résumé)

```
User ─┬─< Goal ─┬─< Step ──< Step (sous-étapes, self-relation)
      │         ├─< ChecklistItem
      │         ├─< Attachment      (document | photo | lien)
      │         ├─< Comment
      │         ├─< CalendarEvent
      │         └─< GoalPerson >─ Person
      ├─< Category
      ├─< JournalEntry ──< JournalPhoto
      ├─< UserBadge >─ Badge
      ├─< XpEvent
      ├─< Notification
      ├─< Skill / Language / Constraint
      └─< AiConversation ──< AiMessage
```

**Décisions notables**

- `Goal.progress` est **dénormalisé** (0-100) et recalculé à chaque mutation d'étape :
  le tableau de bord, le Kanban et la timeline lisent des centaines d'objectifs — recalculer
  en SQL à chaque rendu coûterait cher pour une donnée qui change rarement.
- `Step.parentId` (self-relation) plutôt qu'une table `SubStep` : profondeur illimitée, un seul
  jeu de requêtes et de composants.
- `Goal.aiScore` / `aiReadiness` sont **cachés** en base mais toujours recalculables : le moteur
  est déterministe, la base n'est qu'un cache d'affichage.
- Séparation `Step` (planifiable, datable, imbriquable) vs `ChecklistItem` (micro-tâche à cocher) :
  ce sont deux gestes utilisateur différents.

---

## 4. Moteur d'intelligence (`lib/intelligence`)

Fonction pure `scoreGoal(goal, profile, context) → { score, readiness, blockers, nextActions }`.

Facteurs pondérés :

| Facteur | Effet |
|---|---|
| Urgence (date cible vs aujourd'hui) | ↑ score quand l'échéance approche |
| Priorité déclarée | multiplicateur |
| Faisabilité budgétaire (`savedAmount / estimatedCost`, capacité d'épargne mensuelle) | bloque ou retarde |
| Âge requis (permis, service militaire, majorité) | verrou dur → `LOCKED` |
| Temps disponible hebdo vs temps estimé | ↓ score |
| Compétences / langues requises | génère des sous-objectifs prérequis |
| Saison & période scolaire | fenêtre favorable (safari, voyages, road trip) |
| Momentum (progression récente, étapes en cours) | ↑ score |
| Dépendances entre objectifs | ordonnancement |

Sorties utilisées par : « Objectif recommandé aujourd'hui », tri intelligent, badge
« bientôt réalisable », panneau « Qu'est-ce qui bloque ? ».

---

## 5. Assistant IA (`lib/ai`)

- Route `POST /api/ai/chat` en **streaming**, contexte injecté = profil + objectifs + étapes en cours.
- **Tool use** : `create_steps`, `create_plan`, `estimate_budget`, `reorder_priorities`,
  `create_reminders` → l'assistant écrit réellement en base via les Server Actions.
- **Fallback sans clé API** : générateurs déterministes (templates par catégorie d'objectif +
  moteur d'intelligence). L'utilisateur voit un bandeau « mode hors-ligne » mais tout fonctionne.

---

## 6. Design system

Tokens dans `globals.css` (`@theme`), doublés en variables sémantiques light/dark.

Palette : rose pastel `#F8BBD0` · lavande `#C9B6E4` · turquoise clair `#A7E8E0` ·
blanc cassé `#FDFBF9` · gris très clair `#F3F1F4` · or `#E3B778`.

Vocabulaire visuel : cartes à coins `--radius-xl` (20-28 px), ombres douces colorées
(`shadow-soft`, `shadow-glow`), dégradés maillés en fond, doodles SVG et étoiles animées,
confettis à la complétion, micro-interactions sur chaque état interactif.

L'objectif final **#25 (privatiser un parc d'attractions)** possède un traitement dédié :
carte « holographique » plein largeur, dégradé animé, compte à rebours, halo doré.

### Couleurs de graphique

Les pastels de la marque sont trop clairs et trop peu saturés pour porter de la donnée :
ils échouent aux tests de contraste et de séparation en vision daltonienne. `lib/charts.ts`
définit donc des variantes plus profondes des mêmes teintes, validées séparément pour le
thème clair et le thème sombre (bande de luminosité OKLCH, chroma minimal, ΔE ≥ 8 entre
paires adjacentes, contraste ≥ 3:1). L'ordre des couleurs est fixe : masquer une série ne
repeint jamais les autres.

Chaque graphique est accompagné d'une **vue tableau repliable** — un graphique sans
équivalent textuel est inaccessible au lecteur d'écran et illisible à l'impression.
