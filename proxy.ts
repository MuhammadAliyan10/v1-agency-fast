// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import type { UserRole, SessionPayload } from "@/lib/auth/session";

// Roles allowed in each portal segment
const PORTAL_ACL: Record<string, UserRole[]> = {
  "/admin":   ["admin", "manager"],
  "/kitchen": ["kitchen", "admin"],
  "/waiter":  ["waiter", "admin"],
  "/rider":   ["rider", "admin"],
};

// Where each role lands after login
const ROLE_HOME: Record<UserRole, string> = {
  admin:    "/admin/dashboard",
  manager:  "/admin/dashboard",
  kitchen:  "/kitchen",
  waiter:   "/waiter",
  rider:    "/rider",
  customer: "/",
};

const PUBLIC_PATHS = [
  "/admin/login",
  "/api/",
  "/_next/",
  "/favicon.ico",
  "/icon.png",
];

function getJwtKey(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "";
  return new TextEncoder().encode(secret);
}

async function decodeSession(request: NextRequest): Promise<SessionPayload | null> {
  const token =
    request.cookies.get("cc_session")?.value ??
    request.cookies.get("cc_admin_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtKey(), { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

function matchedPortal(pathname: string): string | null {
  for (const prefix of Object.keys(PORTAL_ACL)) {
    if (pathname.startsWith(prefix)) return prefix;
  }
  return null;
}

function redirectTo(request: NextRequest, dest: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = dest;
  return NextResponse.redirect(url);
}

function clearAndRedirect(request: NextRequest, dest: string): NextResponse {
  const res = redirectTo(request, dest);
  res.cookies.delete("cc_session");
  res.cookies.delete("cc_admin_session");
  return res;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    if (pathname === "/admin/login") {
      if (request.nextUrl.searchParams.has("clear_session")) {
        // Strip the query param and clear cookies
        const url = request.nextUrl.clone();
        url.searchParams.delete("clear_session");
        const res = NextResponse.redirect(url);
        res.cookies.delete("cc_session");
        res.cookies.delete("cc_admin_session");
        return res;
      }
      
      const session = await decodeSession(request);
      if (session && session.role !== "customer") {
        return redirectTo(request, ROLE_HOME[session.role as UserRole]);
      }
    }
    return NextResponse.next();
  }

  const portal = matchedPortal(pathname);
  if (!portal) return NextResponse.next();

  const session = await decodeSession(request);

  if (!session) {
    return clearAndRedirect(request, "/admin/login");
  }

  const allowedRoles = PORTAL_ACL[portal];
  const userRole = session.role as UserRole;

  if (!allowedRoles.includes(userRole)) {
    return redirectTo(request, ROLE_HOME[userRole]);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/kitchen/:path*",
    "/waiter/:path*",
    "/rider/:path*",
  ],
};
