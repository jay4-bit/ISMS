import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const directDatabaseUrl =
  process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!directDatabaseUrl) {
  console.error(
    "Migration guard: DIRECT_DATABASE_URL or DATABASE_URL must be configured.",
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: directDatabaseUrl } },
});

const migrationNames = readdirSync("./prisma/migrations", {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory() && /^\d+_.+/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

// These migrations contain only additive, idempotent SQL and are safe to run
// once when adopting Prisma Migrate on a schema previously created by db push.
const legacySafeMigrations = new Set([
  "20260811190000_production_hardening",
]);

function runPrisma(args) {
  const result = spawnSync("./node_modules/.bin/prisma", args, {
    env: {
      ...process.env,
      DATABASE_URL: directDatabaseUrl,
      DIRECT_DATABASE_URL: directDatabaseUrl,
    },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

try {
  const [tableState] = await prisma.$queryRaw`
    SELECT
      COUNT(*) FILTER (WHERE tablename <> '_prisma_migrations')::int
        AS "applicationTableCount",
      BOOL_OR(tablename = '_prisma_migrations')
        AS "hasMigrationTable"
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
  `;

  let migrationCount = 0;
  if (tableState.hasMigrationTable) {
    const [migrationState] = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*)::int AS "migrationCount" FROM "_prisma_migrations"',
    );
    migrationCount = migrationState.migrationCount;
  }

  await prisma.$disconnect();

  if (migrationCount > 0) {
    console.log(
      `Migration guard: found ${migrationCount} migration record(s); deploying pending migrations.`,
    );
    runPrisma(["migrate", "deploy"]);
  } else if (tableState.applicationTableCount === 0) {
    console.log(
      "Migration guard: database is empty; creating the schema and migration history.",
    );
    runPrisma(["db", "push", "--skip-generate"]);

    if (migrationNames.length === 0) {
      throw new Error(
        "No checked-in migration directories were found after schema initialization.",
      );
    }

    for (const migrationName of migrationNames) {
      runPrisma(["migrate", "resolve", "--applied", migrationName]);
    }

    console.log(
      `Migration guard: initialized the schema and baselined ${migrationNames.length} migration(s).`,
    );
  } else {
    const unsafeMigrations = migrationNames.filter(
      (migrationName) => !legacySafeMigrations.has(migrationName),
    );

    if (unsafeMigrations.length > 0) {
      throw new Error(
        `Existing untracked schema cannot be baselined automatically because these migrations are not marked legacy-safe: ${unsafeMigrations.join(", ")}`,
      );
    }

    console.log(
      `Migration guard: found ${tableState.applicationTableCount} existing application table(s) and no migration history; applying additive migration SQL before baselining.`,
    );

    for (const migrationName of migrationNames) {
      runPrisma([
        "db",
        "execute",
        "--file",
        `prisma/migrations/${migrationName}/migration.sql`,
        "--schema",
        "prisma/schema.prisma",
      ]);
      runPrisma(["migrate", "resolve", "--applied", migrationName]);
    }

    console.log(
      `Migration guard: updated and baselined the existing schema with ${migrationNames.length} migration(s).`,
    );
  }
} catch (error) {
  await prisma.$disconnect().catch(() => undefined);
  console.error("Migration guard failed:", error);
  process.exit(1);
}
