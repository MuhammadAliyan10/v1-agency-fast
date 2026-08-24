import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!);

async function dropAll() {
  console.log("Dropping all tables and enums...");
  await sql`DROP SCHEMA public CASCADE;`;
  await sql`CREATE SCHEMA public;`;
  console.log("Done.");
}

dropAll().catch(console.error);
