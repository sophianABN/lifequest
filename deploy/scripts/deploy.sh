#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Déploiement de LifeQuest sur le VPS.
#
#   deploy.sh <commit-complet>
#
# C'est ce script, et lui seul, que la clé SSH du workflow GitHub peut lancer
# (commande forcée dans authorized_keys). Il ne construit rien : l'image a déjà
# été publiée sur GHCR par le workflow `image.yml`.
#
# Séquence : sauvegarde → écriture de la révision → pull → migrations → bascule
# → contrôle de santé. En cas d'échec du contrôle, retour à la révision
# précédente.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR=/srv/apps/lifequest
ENV_FILE="$APP_DIR/.env"
COMPOSE_FILE="$APP_DIR/source/deploy/compose.yaml"
REVISION_FILE="$APP_DIR/DEPLOYED_REVISION"

log() { printf '\033[1;35m▸\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

REV="${1:-}"
[[ "$REV" =~ ^[0-9a-f]{40}$ ]] || fail "Révision attendue : un commit complet de 40 caractères (reçu « ${REV} »)."
[[ -f "$ENV_FILE" ]] || fail "$ENV_FILE est absent."
[[ -f "$COMPOSE_FILE" ]] || fail "$COMPOSE_FILE est absent — la source n'a pas été synchronisée."

PREVIOUS=$(cat "$REVISION_FILE" 2>/dev/null || echo "")

compose() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

# ── Sauvegarde avant toute chose ─────────────────────────────────────────────
# Une migration Prisma est irréversible : on ne se lance pas sans filet.
if [[ -n "$PREVIOUS" ]]; then
  log "Sauvegarde de la base avant migration"
  "$APP_DIR/source/deploy/scripts/backup-daily.sh" --tag "predeploy-${REV:0:12}"
fi

# ── Révision ─────────────────────────────────────────────────────────────────
log "Révision cible : $REV"
tmp=$(mktemp)
# Réécrit les deux variables d'identité sans toucher aux secrets du fichier.
sed -e "s|^LIFEQUEST_IMAGE_TAG=.*|LIFEQUEST_IMAGE_TAG=sha-${REV}|" \
    -e "s|^LIFEQUEST_REVISION=.*|LIFEQUEST_REVISION=${REV}|" \
    "$ENV_FILE" > "$tmp"
cat "$tmp" > "$ENV_FILE"   # préserve les droits 600 du fichier existant
rm -f "$tmp"

# ── Validation puis déploiement ──────────────────────────────────────────────
log "Validation du manifeste"
compose config --quiet || fail "Le compose est invalide."

log "Récupération de l'image"
compose pull --quiet postgres app || fail "Image introuvable sur GHCR pour sha-${REV}."

log "Migrations et bascule"
compose up -d --remove-orphans

# ── Contrôle de santé ────────────────────────────────────────────────────────
log "Contrôle de santé"
healthy=false
for _ in $(seq 1 30); do
  state=$(docker inspect --format '{{.State.Health.Status}}' lifequest-app 2>/dev/null || echo "absent")
  [[ "$state" == "healthy" ]] && { healthy=true; break; }
  [[ "$state" == "absent" ]] && break
  sleep 4
done

if [[ "$healthy" != true ]]; then
  printf '\033[1;31m✗\033[0m Le conteneur ne répond pas. Journal :\n' >&2
  compose logs --tail 60 app >&2 || true
  if [[ -n "$PREVIOUS" ]]; then
    log "Retour à $PREVIOUS"
    sed -i -e "s|^LIFEQUEST_IMAGE_TAG=.*|LIFEQUEST_IMAGE_TAG=sha-${PREVIOUS}|" \
           -e "s|^LIFEQUEST_REVISION=.*|LIFEQUEST_REVISION=${PREVIOUS}|" "$ENV_FILE"
    compose up -d app
  fi
  # Les migrations déjà appliquées ne sont pas annulées : c'est volontaire,
  # une migration appliquée n'est jamais réécrite. Restaurer la sauvegarde si
  # le schéma est en cause (voir /srv/BACKUP_RESTORE.md).
  fail "Déploiement échoué, retour arrière effectué."
fi

echo "$REV" > "$REVISION_FILE"
log "Déployé : $REV"
compose ps --format 'table {{.Name}}\t{{.Image}}\t{{.Status}}'
