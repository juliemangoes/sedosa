// Loads the studio's services, add-ons, locations and forms into an empty database.
import { openDb } from "../src/db/index";
import { seedIfEmpty } from "../src/db/seed";

const { db } = await openDb();
const seeded = await seedIfEmpty(db);
console.log(seeded ? "Seeded studio data." : "Database already has services; seed skipped.");
process.exit(0);
