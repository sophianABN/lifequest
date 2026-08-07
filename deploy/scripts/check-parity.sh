#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Contrôle de parité : le commit doit être le même partout.
#
# Quatre sources indépendantes : DEPLOYED_REVISION, les deux variables du
# `.env`, le tag de l'image tirée, et le label OCI gravé dans l'image. Une
# divergence signifie qu'un déploiement s'est arrêté au milieu.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

APP_DIR=/srv/apps/lifequest
ENV_FILE="$APP_DIR/.env"

declare -i ecarts=0
verifier() {
  local libelle="$1" attendu="$2" obtenu="$3"
  if [[ "$attendu" == "$obtenu" ]]; then
    printf '  \033[32m✓\033[0m %-24s %s\n' "$libelle" "$obtenu"
  else
    printf '  \033[31m✗\033[0m %-24s %s (attendu %s)\n' "$libelle" "$obtenu" "$attendu"
    ecarts+=1
  fi
}

reference=$(cat "$APP_DIR/DEPLOYED_REVISION" 2>/dev/null || echo "absent")
echo "Référence (DEPLOYED_REVISION) : $reference"

verifier "LIFEQUEST_REVISION" "$reference" \
  "$(grep -m1 '^LIFEQUEST_REVISION=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || echo absent)"
verifier "LIFEQUEST_IMAGE_TAG" "sha-$reference" \
  "$(grep -m1 '^LIFEQUEST_IMAGE_TAG=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || echo absent)"

image=$(docker inspect lifequest-app --format '{{.Config.Image}}' 2>/dev/null || echo absent)
verifier "image du conteneur" "sha-$reference" "${image##*:}"

verifier "label OCI de l'image" "$reference" \
  "$(docker inspect lifequest-app --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' 2>/dev/null || echo absent)"

echo
if (( ecarts > 0 )); then
  echo "$ecarts écart(s) — voir /srv/apps/lifequest/source/deploy/README.md" >&2
  exit 1
fi
echo "Parité vérifiée."
