import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Keys will be generated dynamically to avoid build-time errors when env vars are missing

export interface SessionPayload {
  id: string;
  role: string;
}

function getJwtKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("FATAL: JWT_SECRET environment variable is missing.");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: SessionPayload): Promise<string> {
  const key = getJwtKey();
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const key = getJwtKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function createSession(userId: string, role: string) {
  const token = await signToken({ id: userId, role });
  const cookieStore = await cookies();
  cookieStore.set("cc_admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("cc_admin_session");
}

export async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("cc_admin_session");
  
  if (!sessionCookie || !sessionCookie.value) {
    throw new Error("UNAUTHORIZED: Missing session cookie");
  }
  
  const payload = await verifyToken(sessionCookie.value);
  if (!payload || (payload.role !== "admin" && payload.role !== "manager")) {
    throw new Error("UNAUTHORIZED: Invalid or insufficient permissions");
  }
  
  return payload;
}
