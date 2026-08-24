import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_development_only";
const key = new TextEncoder().encode(JWT_SECRET);

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  if (!path.startsWith("/admin")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("cc_admin_session")?.value;
  let isValid = false;

  if (token) {
    try {
      await jwtVerify(token, key, { algorithms: ["HS256"] });
      isValid = true;
    } catch (error) {
      isValid = false;
    }
  }

  const isLoginPage = path === "/admin/login";

  if (isLoginPage && isValid) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  if (!isLoginPage && !isValid) {
    const redirectUrl = new URL("/admin/login", request.url);
    redirectUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
