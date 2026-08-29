import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  if (!path.startsWith("/admin")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("cc_admin_session")?.value;
  let isValid = false;

  if (token) {
    try {
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        console.error("FATAL: JWT_SECRET environment variable is missing.");
        throw new Error("JWT_SECRET is missing");
      }
      const key = new TextEncoder().encode(JWT_SECRET);
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
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("cc_admin_session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
