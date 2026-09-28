import { NextRequest, NextResponse } from "next/server";
import { displayAllowed } from "@/lib/attendance/displayAuth";
import { foldCheckins } from "@/lib/firebase/checkins";
import { getEvent } from "@/lib/firebase/portal";

export const dynamic = "force-dynamic";

// Polled by the display every 20s. Merges new check-ins into the event (the
// display is the single writer during an event), then counts from the one
// event doc: ~2 reads per poll, versus reading every member like the recruiting site did.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (!(await displayAllowed(url.searchParams.get("k")))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const eventId = url.searchParams.get("eventId") || "";
  await foldCheckins(eventId);
  const event = await getEvent(eventId);
  if (!event) return NextResponse.json({ error: "Unknown event" }, { status: 404 });
  return NextResponse.json({ count: event.attendedUids.length }, { headers: { "Cache-Control": "no-store" } });
}
