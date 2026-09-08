import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be defined in the environment.");
}

// Use a global singleton in development to prevent connection exhaustion from HMR
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

const pool = globalForDb.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,                    // cap well below Neon free-tier limit of ~10
  idleTimeoutMillis: 10_000, // release idle connections after 10s
  connectionTimeoutMillis: 5_000, // fail fast rather than queue indefinitely
});

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle({ client: pool, schema });
