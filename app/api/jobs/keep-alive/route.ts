// app/api/jobs/keep-alive/route.ts
// Called every 4 minutes by an Upstash QStash Schedule to prevent Neon free-tier
// compute from auto-suspending (which adds 2–8s cold start latency after 5 min idle).
import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { db } from "@/database/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function handler(_req: NextRequest) {
  const start = Date.now();
  await db.execute(sql`SELECT 1`);
  const elapsed = Date.now() - start;

  console.log(`[keep-alive] Neon ping OK — ${elapsed}ms`);
  return NextResponse.json({ ok: true, latency_ms: elapsed, ts: new Date().toISOString() });
}

export const POST = verifySignatureAppRouter(handler);
