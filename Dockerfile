# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm cache clean --force

FROM dependencies AS builder
COPY prisma ./prisma
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
    DIRECT_DATABASE_URL=postgresql://build:build@localhost:5432/build \
    npx prisma generate
COPY . .
RUN npm run build

FROM dependencies AS migrate
COPY prisma ./prisma
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
    DIRECT_DATABASE_URL=postgresql://build:build@localhost:5432/build \
    npx prisma generate
COPY scripts/migrate-if-safe.mjs ./scripts/migrate-if-safe.mjs
CMD ["node", "scripts/migrate-if-safe.mjs"]

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
