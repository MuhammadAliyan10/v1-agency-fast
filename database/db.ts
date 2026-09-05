import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be defined in the environment.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,                    // cap well below Neon free-tier limit of ~10
  idleTimeoutMillis: 10_000, // release idle connections after 10s
  connectionTimeoutMillis: 5_000, // fail fast rather than queue indefinitely
});
export const db = drizzle({ client: pool, schema });
