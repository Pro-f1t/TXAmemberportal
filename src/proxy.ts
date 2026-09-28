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

  // /admin is NOT gated on the role cookie here. The cookie is written at
  // sign-in and goes stale when an exec promotes someone mid-session (they'd
  // see the Console button but bounce back to Home). The admin layout's
  // staffPage() checks the real role on every request and redirects non-staff.

  return NextResponse.next();
}

// /c/* (QR scan), /checkin/* and /live/* are deliberately NOT matched: a scan from a
// signed-out phone must reach /c/ to get its pass cookie before any login redirect,
// and /checkin + /live do their own auth. Don't add them here.
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
