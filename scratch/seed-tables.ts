import { db } from "../database/db";
import { restaurantTables } from "../database/schema";

async function run() {
  console.log("Seeding tables...");
  const newTables = Array.from({ length: 8 }).map((_, i) => ({
    name: `Table ${i + 1}`,
    capacity: 4,
    isActive: true,
  }));
  await db.insert(restaurantTables).values(newTables);
  console.log("Done");
  process.exit(0);
}

run().catch(console.error);
