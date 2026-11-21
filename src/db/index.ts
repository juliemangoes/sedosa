import path from "node:path";
import fs from "node:fs";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

type Holder = { db?: DB; ready?: Promise<DB> };
const g = globalThis as unknown as { __sedosaDb?: Holder };
const holder: Holder = (g.__sedosaDb ??= {});

export const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

/**
 * Opens the database.
 *  - DATABASE_URL=postgres://…  → real Postgres (production).
 *  - DATABASE_URL unset         → embedded PGlite stored in ./.data/pglite (local dev).
 *  - DATABASE_URL=memory://     → throwaway in-memory PGlite (tests).
 */
export async function openDb(url = process.env.DATABASE_URL ?? ""): Promise<{ db: DB; kind: "pg" | "pglite" }> {
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: 5 });
    return { db: drizzlePg(pool, { schema }) as unknown as DB, kind: "pg" };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  let client;
  if (url === "memory://") {
    client = new PGlite();
  } else {
    const dir = url.startsWith("pglite://") ? url.slice("pglite://".length) : path.join(process.cwd(), ".data", "pglite");
    fs.mkdirSync(dir, { recursive: true });
    client = new PGlite(dir);
  }
  return { db: drizzlePglite(client, { schema }) as unknown as DB, kind: "pglite" };
}

export async function runMigrations(db: DB, kind: "pg" | "pglite") {
  if (kind === "pg") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migratePg(db as any, { migrationsFolder: MIGRATIONS_DIR });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migratePglite(db as any, { migrationsFolder: MIGRATIONS_DIR });
  }
}

/**
 * Shared database handle for the app. With the embedded database the schema
 * is migrated and seeded automatically on first use; production Postgres is
 * migrated by `npm run db:setup` during deploy.
 */
export function getDb(): Promise<DB> {
  if (holder.db) return Promise.resolve(holder.db);
  holder.ready ??= (async () => {
    if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set. Use a Postgres connection string in production (or pglite://./.data/pglite to run the embedded database locally).",
      );
    }
    const { db, kind } = await openDb();
    if (kind === "pglite") {
      await runMigrations(db, kind);
      const { seedIfEmpty } = await import("./seed");
      await seedIfEmpty(db);
    }
    holder.db = db;
    return db;
  })();
  return holder.ready;
}

/** Tests inject their own database. */
export function setDb(db: DB) {
  holder.db = db;
  holder.ready = Promise.resolve(db);
}
