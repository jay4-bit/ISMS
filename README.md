# Inshop

Production-oriented inventory and sales management built with Next.js, Prisma, and Neon PostgreSQL.

## Production architecture

- `app`: stateless, non-root Next.js standalone container with a read-only filesystem, exposed on `APP_PORT` (default `3000`).
- `migrate`: one-shot, guarded Prisma initialization/migration container using Neon's direct connection.
- Neon: the only PostgreSQL database. Docker Compose does not run or persist a database.

There is no reverse-proxy container. In production, terminate HTTPS and handle load balancing with your hosting platform, cloud load balancer, or CDN/WAF before traffic reaches `APP_PORT`.

## Required configuration

Copy `.env.example` to `.env` and replace every placeholder. Do not commit `.env`.

Use the Neon pooled hostname (normally containing `-pooler`) for `DATABASE_URL`, and the non-pooled hostname for `DIRECT_DATABASE_URL`. Keep `sslmode=require`. The example limits each app container to ten database connections; when scaling, keep the total below the Neon plan's connection allowance.

Generate the application secret with:

```bash
openssl rand -base64 48
```

`APP_ORIGIN` must be the application's exact public HTTPS origin. `APP_PORT` controls the host port mapped to the app container and defaults to `3000`.

For admin access, bcrypt-hash the password and then base64-encode the complete bcrypt hash for `ADMIN_PASSWORD_HASH_B64`. Never store the plain admin password in an environment file.

## Deploy

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f migrate app
```

The migration service examines the database before making changes:

- If there are no application tables and no migration records, it creates the current schema and records every checked-in migration as the baseline.
- If `_prisma_migrations` contains records, it deploys pending migrations normally.
- If application tables exist but there is no populated migration history, it runs only migrations explicitly marked as additive and idempotent, then records them as the migration baseline. It refuses untracked migrations that have not been reviewed as legacy-safe.

The app starts after the guard exits successfully. For multi-instance or multi-host scaling, run the stateless app image behind a managed load balancer and move rate limiting to that shared edge layer. Adjust the Neon connection budget before adding instances.

## Release checks

Run these before every deployment:

```bash
npm ci
npx prisma validate
npm audit
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Lighthouse should be run against a production build and the real HTTPS hostname. Authenticated dashboard pages also need a seeded test account for meaningful performance coverage.

## Operations checklist

- Enable Neon point-in-time restore/backups and test restoration regularly.
- Restrict Neon access and rotate database, JWT, admin, and SMTP credentials.
- Configure SMTP before accepting registrations; verification and recovery depend on it.
- Send application and platform ingress logs to a retained log service and alert on HTTP 5xx, latency, container restarts, and Neon connection saturation.
- Put a CDN/WAF in front of the host for distributed rate limiting and DDoS protection at larger traffic levels.
- Run dependency audit, migration testing, and Lighthouse in CI for every release.
- Restrict `APP_PORT` at the host firewall so only your trusted HTTPS ingress or load balancer can reach it.

## Local development

Set both database variables to a development Neon branch, then run:

```bash
npm install
npx prisma generate
npm run dev
```

Use a separate Neon branch/database for development and tests. Never point `prisma db push`, seed scripts, or automated tests at production.
