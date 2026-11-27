// The embedded database for local development and tests. Only loaded under Node.js,
// never in the Cloudflare Worker (see openDb in ./index).
import path from "node:path";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

export function openPglite(url: string) {
  let client;
  if (url === "memory://") {
    client = new PGlite();
  } else {
    const dir = url.startsWith("pglite://") ? url.slice("pglite://".length) : path.join(process.cwd(), ".data", "pglite");
    fs.mkdirSync(dir, { recursive: true });
    client = new PGlite(dir);
  }
  return drizzle(client, { schema });
}

export async function migratePglite(db: unknown, migrationsFolder: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migrate(db as any, { migrationsFolder });
}
