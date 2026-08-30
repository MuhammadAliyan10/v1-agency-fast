import { db } from "./database/db";
import { sql } from "drizzle-orm";

async function main() {
  const res = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'orders';
  `);
  console.log(res.rows);
  process.exit(0);
}
main().catch(console.error);
