// Applies database migrations. Run during deploy: `npm run db:setup`.
import { openDb, runMigrations } from "../src/db/index";

const { db, kind } = await openDb();
await runMigrations(db, kind);
console.log(`Migrations applied (${kind}).`);
process.exit(0);
