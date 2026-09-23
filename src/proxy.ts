import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// UX-only redirects. The real security is the server-side guards in
// lib/auth/guard.ts — the user_role cookie is client-visible and not trusted.
// Keep in sync with STAFF_ROLES in lib/models/Member.ts and Nav.tsx.
const STAFF_ROLES = ["exec", "admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("session");
  const role = request.cookies.get("user_role")?.value;

  const isLogin = pathname === "/auth/login";

  // Everything matched below except the login page needs a session.
  if (!session && !isLogin) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (session && isLogin) {
    const target = STAFF_ROLES.includes(role || "") ? "/admin" : "/";
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (pathname.startsWith("/admin") && (!role || !STAFF_ROLES.includes(role))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/opportunities/:path*",
    "/applications/:path*",
    "/events/:path*",
    "/members/:path*",
    "/profile/:path*",
    "/pending",
    "/admin/:path*",
    "/auth/login",
  ],
};
