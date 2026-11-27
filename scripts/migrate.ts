// Applies database migrations. Run during deploy: `npm run db:setup`.
import { openDb, runMigrations } from "../src/db/index";

// On a hosted build (Cloudflare Workers Builds sets WORKERS_CI), never fall back to the
// embedded local database: stop with a clear message instead of deploying a site that can't save anything.
if ((process.env.WORKERS_CI || process.env.VERCEL) && !/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "")) {
  console.error(
    "\nDATABASE_URL is missing. Add your Neon connection string (postgresql://…) as a build variable:\n" +
      "Cloudflare → Workers & Pages → sedosa → Settings → Build → Variables and secrets.\n",
  );
  process.exit(1);
}

const { db, kind } = await openDb();
await runMigrations(db, kind);
console.log(`Migrations applied (${kind}).`);
process.exit(0);
