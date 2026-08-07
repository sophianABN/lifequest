# Déploiement LifeQuest

LifeQuest tourne sur le VPS aux côtés des autres projets, derrière le Traefik
partagé de `/srv/infra/traefik`. Ce document est la procédure canonique ; il est
recopié sous `/srv/apps/lifequest/README.md` à chaque déploiement.

```text
Internet ─443─▶ Traefik ─(réseau edge)─▶ lifequest-app ─(réseau lifequest_default)─▶ lifequest-postgres
```

## Topologie sur le serveur

```text
/srv/apps/lifequest/
  .env                    secrets et révision d'image, mode 600, jamais versionné
  DEPLOYED_REVISION       commit effectivement déployé
  bin/remote-deploy       commande forcée de la clé SSH du workflow
  source -> source-<sha>/ manifestes extraits de l'image déployée
```

## Invariants

- Aucun `ports:` dans la stack — Traefik est le seul à publier sur l'hôte.
- Postgres ne rejoint jamais le réseau `edge`.
- `DEPLOYED_REVISION`, `LIFEQUEST_REVISION`, `LIFEQUEST_IMAGE_TAG` et le label
  OCI de l'image portent le même commit. `check-parity.sh` le vérifie.
- Une migration appliquée n'est jamais réécrite.
- Jamais de `docker compose down -v`.

## Chaîne GitHub Actions

| Workflow | Déclencheur | Rôle |
|---|---|---|
| `ci.yml` | PR et push | types, lint, build, migrations rejouées sur une base vierge, seed, manifestes |
| `image.yml` | push sur `main` | construit et publie `ghcr.io/sophianabn/lifequest:sha-<commit>` |
| `deploy.yml` | manuel | déclenche le déploiement de la révision choisie |

Le déploiement est manuel : construire est automatique, mettre en production
reste une décision.

## Ce que fait un déploiement

`deploy.yml` n'envoie qu'une chaîne au serveur : la révision. La clé SSH porte
une **commande forcée** (`bin/remote-deploy`) — elle n'ouvre pas de shell, ne
copie aucun fichier, ne lit pas le `.env`. Le serveur enchaîne ensuite :

1. `docker pull` de l'image du commit ;
2. extraction de `/app/deploy` **depuis l'image** vers `source-<sha>/` — les
   manifestes et le binaire viennent donc forcément du même artefact ;
3. sauvegarde de la base (`backup-daily.sh --tag predeploy-…`) ;
4. réécriture des deux variables d'identité dans `.env`, secrets intacts ;
5. `compose up -d` : migrations Prisma puis bascule de l'application ;
6. attente du healthcheck. En cas d'échec, journal affiché et retour à la
   révision précédente.

Les migrations déjà appliquées ne sont pas annulées par le retour arrière.
Si le schéma est en cause, restaurer la sauvegarde de l'étape 3.

## Première installation

Trois choses ne peuvent pas être automatisées :

1. **DNS** — un enregistrement `A` `lifequest` → `51.255.162.148` chez
   Cloudflare, sur la zone `absoley.fr`. Traefik obtient le certificat par
   challenge DNS-01 ; l'enregistrement peut rester proxifié.
2. **Accès GHCR depuis le VPS** — le dépôt est privé, donc l'image aussi.
   Créer un jeton classique avec la seule portée `read:packages`
   (github.com/settings/tokens), puis :

   ```bash
   echo '<jeton>' | docker login ghcr.io -u sophianABN --password-stdin
   ```

3. **Secrets applicatifs** — compléter `MISTRAL_API_KEY` et les variables `S3_*`
   dans `/srv/apps/lifequest/.env`. Sans elles l'application démarre quand
   même : l'assistant bascule sur son moteur déterministe et les pièces jointes
   n'acceptent qu'une URL externe.

Le reste (arborescence, clé de déploiement, `.env`, secrets GitHub, cron de
sauvegarde) est mis en place par la procédure d'installation.

## Secrets GitHub attendus

| Nom | Contenu |
|---|---|
| `VPS_HOST` | adresse du serveur |
| `VPS_USER` | `ubuntu` |
| `VPS_SSH_KEY` | clé privée ed25519 dédiée au déploiement |
| `VPS_KNOWN_HOSTS` | empreinte du serveur, pour épingler l'hôte |

## Compte de démonstration

Le bouton « Essayer le compte de démonstration » ouvre `demo@lifequest.app`,
en lecture seule. Il faut le provisionner une fois après le premier
déploiement — et le rejouer de temps en temps, les dates du jeu de données
étant relatives à l'instant du seed :

```bash
docker exec lifequest-app npm run db:demo
```

Ce script ne touche qu'à ce compte : il le supprime puis le recrée. Les
comptes réels ne sont jamais concernés. **Ne jamais lancer `db:seed` en
production** — celui-là vide toute la base.

## Exploitation

```bash
# état
docker compose --env-file /srv/apps/lifequest/.env \
  -f /srv/apps/lifequest/source/deploy/compose.yaml ps

# parité commit / image / conteneur
/srv/apps/lifequest/source/deploy/scripts/check-parity.sh

# journal applicatif
docker logs --tail 100 lifequest-app

# sauvegarde manuelle
/srv/apps/lifequest/source/deploy/scripts/backup-daily.sh
```

## Retour arrière

```bash
/srv/apps/lifequest/bin/remote-deploy <commit-précédent>
```

Le script refait le chemin complet vers la révision indiquée. Si une migration
doit être défaite, restaurer d'abord le dump correspondant :

```bash
gunzip -c /srv/backups/daily/lifequest/lifequest-<horodatage>.sql.gz \
  | docker exec -i lifequest-postgres psql -U lifequest lifequest
```
