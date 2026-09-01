// lib/auth/verify-session.ts
/**
 * DB-side session verification for instant revocation.
 * Call this at the top of every portal layout.tsx (Server Component).
 * NOT run in middleware (edge DB restriction).
 */
import { db } from "@/database/db";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSession, deleteSession, type UserRole } from "./session";

export async function verifySessionOrRedirect(
  allowedRoles: UserRole[],
  loginPath = "/admin/login"
): Promise<import("./session").SessionPayload> {
  const session = await getSession();

  if (!session) {
    redirect(loginPath);
  }

  // DB check: validate sessionVersion and isActive for instant revocation
  const user = await db
    .select({ sessionVersion: users.sessionVersion, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1)
    .then(r => r[0]);

  if (!user || !user.isActive || user.sessionVersion !== session.sessionVersion) {
    // Session is stale or user was deactivated — redirect to login with clear flag
    // Middleware will intercept this and destroy the cookie.
    redirect(`${loginPath}?clear_session=1`);
  }

  if (!allowedRoles.includes(session.role)) {
    redirect(loginPath);
  }

  return session;
}
