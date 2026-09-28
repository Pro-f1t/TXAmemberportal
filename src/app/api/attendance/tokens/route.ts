import { NextRequest, NextResponse } from "next/server";
import { mintTokenBatch, checkinConfigured } from "@/lib/attendance/token";
import { displayAllowed } from "@/lib/attendance/displayAuth";

export const dynamic = "force-dynamic";

// 60 signed tokens (10 minutes) per request. The display rotates through them
// locally and refills with ~2 minutes to spare — no database reads at all.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (!(await displayAllowed(url.searchParams.get("k")))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkinConfigured()) return NextResponse.json({ error: "CHECKIN_SECRET is not set." }, { status: 503 });
  const eventId = url.searchParams.get("eventId") || "";
  if (!eventId) return NextResponse.json({ error: "Missing event." }, { status: 400 });
  return NextResponse.json(mintTokenBatch(eventId), { headers: { "Cache-Control": "no-store" } });
}
