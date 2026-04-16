// ═══════════════════════════════════════════════════
// Middleware — Route Protection
// ═══════════════════════════════════════════════════

import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register", "/api/auth", "/api/payments/notify"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Check auth token exists (simple check — full verification in API routes)
  const token = request.cookies.get("bh_token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
