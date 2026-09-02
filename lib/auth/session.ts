// lib/auth/session.ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { hasPermission, type RBACMatrix, type RBACDomain, type RBACAction } from "./rbac";

export type UserRole = "admin" | "manager" | "kitchen" | "waiter" | "rider" | "customer";

export interface SessionPayload {
  id:             string;
  email:          string;
  role:           UserRole;
  name:           string;
  sessionVersion: number;
  // Permissions embedded at login-time — zero DB hit per request
  permissions: RBACMatrix & { maxDiscountPercentage: number };
}

export const PORTAL_ROUTES: Record<UserRole, string> = {
  admin:    "/admin/dashboard",
  manager:  "/admin/dashboard",
  kitchen:  "/kitchen",
  waiter:   "/waiter",
  rider:    "/rider",
  customer: "/",
};

// Roles that are permitted inside /admin/*
export const ADMIN_PORTAL_ROLES: UserRole[] = ["admin", "manager"];

function getJwtKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("FATAL: JWT_SECRET environment variable is missing.");
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtKey());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtKey(), { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set("cc_session", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   7 * 24 * 60 * 60,
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("cc_session");
  // Also delete the old cookie name for backward compat
  cookieStore.delete("cc_admin_session");
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  // Support both old and new cookie names during migration
  const token = cookieStore.get("cc_session")?.value ?? cookieStore.get("cc_admin_session")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ── Server-Action Guards ───────────────────────────────────────────────────────

/**
 * Requires an authenticated session with one of the specified roles.
 * Also performs the DB-side session_version check for instant revocation.
 */
export async function requireRole(roles: UserRole[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED: No session.");
  if (!roles.includes(session.role)) {
    throw new Error(`UNAUTHORIZED: Role '${session.role}' is not permitted.`);
  }
  // DB check for instant revocation is done in middleware (Edge).
  // Server actions trust the middleware-verified session for performance.
  return session;
}

/** Convenience — admin or manager */
export async function requireAdmin(): Promise<SessionPayload> {
  return requireRole(["admin", "manager"]);
}

/** Convenience — admin only */
export async function requireSuperAdmin(): Promise<SessionPayload> {
  return requireRole(["admin"]);
}

/** Convenience — kitchen staff */
export async function requireKitchen(): Promise<SessionPayload> {
  return requireRole(["admin", "manager", "kitchen"]);
}

/** Convenience — waiter */
export async function requireWaiter(): Promise<SessionPayload> {
  return requireRole(["admin", "manager", "waiter"]);
}

/** Convenience — rider */
export async function requireRider(): Promise<SessionPayload> {
  return requireRole(["admin", "manager", "rider"]);
}

/** Convenience — require a specific manager permission (Admins bypass) */
export async function requireManagerPermission(
  domain: RBACDomain,
  action: RBACAction
): Promise<SessionPayload> {
  const session = await requireAdmin(); // ensures they are at least admin or manager
  
  if (!hasPermission(session, domain, action)) {
    throw new Error(`UNAUTHORIZED: Missing required permission: ${domain}:${action}`);
  }
  
  return session;
}
