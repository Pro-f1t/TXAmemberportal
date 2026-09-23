import { NextResponse } from "next/server";
import { getAllEvents } from "@/lib/firebase/portal";
import { EVENT_TYPE_LABEL } from "@/lib/models/Portal";

export const dynamic = "force-dynamic";

function ics(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/**
 * Public feed of published events, for "Subscribe to Google Calendar". No
 * session: Google fetches this server-to-server. Carries titles, times, and
 * locations only — never RSVPs or attendance.
 */
export async function GET() {
  const events = (await getAllEvents()).filter((e) => e.status === "published");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Texas Accelerate//Member Portal//EN",
    "X-WR-CALNAME:Texas Accelerate",
    "X-WR-TIMEZONE:America/Chicago",
    ...events.flatMap((e) => {
      const end = new Date(e.startsAt.getTime() + 90 * 60 * 1000);
      return [
        "BEGIN:VEVENT",
        `UID:${e.id}@txa-portal`,
        `DTSTAMP:${ics(e.updatedAt)}`,
        `DTSTART:${ics(e.startsAt)}`,
        `DTEND:${ics(end)}`,
        `SUMMARY:${esc(e.title)}`,
        `LOCATION:${esc(e.location)}`,
        `DESCRIPTION:${esc(`${EVENT_TYPE_LABEL[e.type]} · ${e.timeLabel}\n${e.description}`)}`,
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
  ];
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
