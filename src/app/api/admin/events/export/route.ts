import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/firebase/audit";
import { staffRoute } from "@/lib/admin/route";
import { getAllEvents } from "@/lib/firebase/portal";
import { getAllMembers } from "@/lib/firebase/members";
import { EVENT_TYPE_LABEL } from "@/lib/models/Portal";
import { csv } from "@/lib/utils/csv";
import { fmtDateYear } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/** Attendance matrix: one row per member, one column per event. */
export const GET = staffRoute(async ({ member }) => {
  await recordAudit({ source: "console", actorUid: member.uid, actorName: member.name, action: "export.events", detail: "Event attendance CSV" });
  const [events, members] = await Promise.all([getAllEvents(), getAllMembers()]);
  const published = events.filter((e) => e.status === "published");
  const header = ["Name", "Email", "Status", "Attended (counting)", ...published.map((e) => `${e.title} (${fmtDateYear(e.startsAt)} · ${EVENT_TYPE_LABEL[e.type]})`)];
  const rows = members.map((m) => [
    m.name, m.email, m.status,
    published.filter((e) => e.countsForAttendance && e.attendedUids.includes(m.uid)).length,
    ...published.map((e) => (e.attendedUids.includes(m.uid) ? "attended" : e.excusedUids.includes(m.uid) ? "excused" : e.rsvpUids.includes(m.uid) ? "rsvp" : "")),
  ]);
  return new NextResponse(csv([header, ...rows]), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="txa-attendance.csv"' },
  });
});
