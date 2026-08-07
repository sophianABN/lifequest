#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Point d'entrée du déploiement distant — installé en
# /srv/apps/lifequest/bin/remote-deploy et référencé comme commande forcée dans
# ~/.ssh/authorized_keys :
#
#   command="/srv/apps/lifequest/bin/remote-deploy",no-agent-forwarding,\
#   no-port-forwarding,no-pty,no-X11-forwarding,restrict ssh-ed25519 AAAA… deploy@github
#
# Conséquence : la clé du workflow ne peut rien faire d'autre. Elle n'ouvre pas
# de shell, ne copie pas de fichier, ne lit pas le `.env`. Elle transmet une
# seule chose — une révision — et ce script en vérifie la forme avant tout.
#
# Ce fichier est délibérément installé À LA MAIN et n'est pas mis à jour par le
# déploiement : le garde-fou ne doit pas pouvoir être réécrit par ce qu'il
# garde. Le modifier est une intervention consciente.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR=/srv/apps/lifequest
IMAGE=ghcr.io/sophianabn/lifequest

REV="${SSH_ORIGINAL_COMMAND:-${1:-}}"
# Un commit complet, rien d'autre : ni option, ni chemin, ni point-virgule.
if [[ ! "$REV" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Révision invalide." >&2
  exit 2
fi

echo "▸ Image : ${IMAGE}:sha-${REV}"
docker pull --quiet "${IMAGE}:sha-${REV}"

# ── Extraction des manifestes depuis l'image ─────────────────────────────────
# Le compose et les scripts viennent du même artefact que le binaire déployé :
# aucune dérive possible entre ce qui tourne et ce qui décrit comment le lancer.
SRC="${APP_DIR}/source-${REV}"
if [[ ! -d "$SRC" ]]; then
  tmp=$(docker create "${IMAGE}:sha-${REV}")
  trap 'docker rm -f "$tmp" >/dev/null 2>&1 || true' EXIT
  mkdir -p "$SRC"
  docker cp "${tmp}:/app/deploy" "${SRC}/deploy"
  docker rm -f "$tmp" >/dev/null
  trap - EXIT
  chmod +x "${SRC}"/deploy/scripts/*.sh
fi

ln -sfn "$SRC" "${APP_DIR}/source"

exec "${APP_DIR}/source/deploy/scripts/deploy.sh" "$REV"
