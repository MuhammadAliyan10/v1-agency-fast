import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./database/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle({ client: pool, schema });

async function testTransaction() {
  try {
    await db.transaction(async (tx) => {
      console.log("Transaction started");
      const users = await tx.select().from(schema.users).limit(1);
      console.log("Query 1 succeeded");
      const orders = await tx.select().from(schema.orders).limit(1);
      console.log("Query 2 succeeded");
    });
    console.log("Transaction fully supported by neon-serverless Pool!");
  } catch (error: any) {
    console.error("Transaction test failed:");
    console.error(error.message);
  } finally {
    await pool.end();
  }
}

testTransaction();
