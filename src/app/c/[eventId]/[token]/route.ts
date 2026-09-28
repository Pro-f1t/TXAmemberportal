import { NextRequest, NextResponse } from "next/server";
import { verifyToken, mintPass, PASS_COOKIE, PASS_TTL_SECONDS } from "@/lib/attendance/token";

// What the rotating QR encodes. No database work here: the HMAC binds the token
// to the event id, so a valid token is proof enough. Spend it now (inside the
// 10s window), set a 10-minute pass, and hand off to /checkin so the Google
// sign-in detour for signed-out phones can't race the token clock.
// Must stay OUT of the proxy matcher — see src/proxy.ts.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string; token: string }> }) {
  const { eventId, token } = await params;
  const dest = new URL(`/checkin/${encodeURIComponent(eventId)}`, request.url);
  if (!verifyToken(eventId, token)) {
    dest.searchParams.set("e", "expired");
    return NextResponse.redirect(dest);
  }
  const res = NextResponse.redirect(dest);
  res.cookies.set({ name: PASS_COOKIE, value: mintPass(eventId), maxAge: PASS_TTL_SECONDS, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  return res;
}
