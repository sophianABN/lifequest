# ─────────────────────────────────────────────────────────────────────────────
# LifeQuest — image de production
#
# Base Debian slim (pas Alpine) : Prisma 7 et `pg` s'y installent sans surprise
# de libc, et l'image reste raisonnable pour un VPS personnel.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ── Dépendances ──────────────────────────────────────────────────────────────
# `postinstall` lance `prisma generate` : le schéma et `prisma.config.ts`
# doivent être présents, et ce dernier exige une `DATABASE_URL` — factice ici,
# car générer le client ne touche pas la base.
FROM base AS deps
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# ── Build ────────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next lit `.env` au build ; on ne veut aucun secret de développement embarqué.
RUN rm -f .env .env.local
# Une DATABASE_URL factice suffit : le build ne se connecte à rien, mais
# `src/lib/prisma.ts` refuse de s'instancier sans variable.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV NODE_ENV=production
RUN npm run build

# ── Exécution ────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Le commit est gravé dans l'image : `check-parity.sh` compare cette valeur au
# tag tiré et à DEPLOYED_REVISION. Trois sources qui doivent coïncider.
ARG VCS_REF=inconnu
ENV LIFEQUEST_BUILD_REVISION=${VCS_REF}
LABEL org.opencontainers.image.revision=${VCS_REF}

# Les migrations et le seed tournent depuis ce conteneur : on garde le
# node_modules complet (CLI Prisma + tsx) plutôt qu'une sortie `standalone`.
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts

# Les manifestes de déploiement voyagent dans l'image : le VPS les en extrait
# au lieu de les recevoir séparément. Le compose, les scripts et le binaire
# déployé viennent ainsi forcément du même commit.
COPY --from=builder --chown=node:node /app/deploy ./deploy

USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
