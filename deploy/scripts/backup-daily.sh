#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Sauvegarde de la base LifeQuest.
#
#   backup-daily.sh [--tag <suffixe>] [--check-only]
#
# Le dump part dans /srv/backups/daily/lifequest/. Rétention de 14 jours,
# alignée sur les autres sauvegardes du serveur.
#
# `--check-only` ne sauvegarde rien : il vérifie qu'un dump récent et non vide
# existe, et sort en erreur sinon. C'est ce que le cron appelle toutes les
# quatre heures.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_DIR="${BACKUP_ROOT:-/srv/backups/daily}/lifequest"
CONTAINER=lifequest-postgres
RETENTION_DAYS=14
# Un dump plus vieux que ça signale un cron muet.
MAX_AGE_HOURS=26

tag=""
check_only=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag) tag="-$2"; shift 2 ;;
    --check-only) check_only=true; shift ;;
    *) echo "Option inconnue : $1" >&2; exit 2 ;;
  esac
done

mkdir -p "$BACKUP_DIR"

if [[ "$check_only" == true ]]; then
  recent=$(find "$BACKUP_DIR" -name 'lifequest-*.sql.gz' -mmin "-$((MAX_AGE_HOURS * 60))" -size +1k | head -1)
  if [[ -z "$recent" ]]; then
    echo "$(date -Is) ✗ Aucune sauvegarde LifeQuest valide depuis ${MAX_AGE_HOURS} h" >&2
    exit 1
  fi
  echo "$(date -Is) ✓ Sauvegarde récente : $recent"
  exit 0
fi

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "$(date -Is) ✗ Conteneur $CONTAINER absent" >&2
  exit 1
fi

user=$(docker exec "$CONTAINER" printenv POSTGRES_USER)
db=$(docker exec "$CONTAINER" printenv POSTGRES_DB)
out="$BACKUP_DIR/lifequest-$(date +%Y%m%d-%H%M%S)${tag}.sql.gz"

# Le dump passe par un fichier temporaire : un `gzip` interrompu ne doit pas
# laisser une archive tronquée qui ressemblerait à une sauvegarde valide.
tmp="${out}.partiel"
docker exec "$CONTAINER" pg_dump -U "$user" "$db" | gzip > "$tmp"
mv "$tmp" "$out"

size=$(stat -c%s "$out")
if [[ "$size" -lt 1024 ]]; then
  echo "$(date -Is) ✗ Sauvegarde suspecte (${size} octets) : $out" >&2
  exit 1
fi

find "$BACKUP_DIR" -name 'lifequest-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
echo "$(date -Is) ✓ $out ($((size / 1024)) Kio)"
