import Link from "next/link";
import { eventTimeRange } from "@/lib/portal/eventTime";
import { notFound } from "next/navigation";
import { getEvent } from "@/lib/firebase/portal";
import { foldCheckins } from "@/lib/firebase/checkins";
import { getAllMembers } from "@/lib/firebase/members";
import { teamShort, STAFF_ROLES } from "@/lib/models/Member";
import { PageHeader, Pill, Card, Eyebrow } from "@/components/ui";
import AttendanceRoster from "@/components/AttendanceRoster";
import { fmtDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function EventAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await foldCheckins(id);
  const [event, members] = await Promise.all([getEvent(id), getAllMembers()]);
  if (!event) notFound();
  const eligible = members.filter((m) => m.status === "active" || STAFF_ROLES.includes(m.role));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <Link href="/admin/events" className="font-semibold text-accent">Events</Link>
        <span>/</span>
        <span>{event.title}</span>
      </div>
      <PageHeader
        eyebrow={`${fmtDate(event.startsAt)} · ${eventTimeRange(event)} · ${event.location}`}
        title={event.title}
        actions={<Pill href={`/admin/events?id=${event.id}`}>Edit event</Pill>}
      />
      <Card>
        <Eyebrow>{event.rsvpUids.length} going · {event.attendedUids.length} attended · {event.excusedUids.length} excused</Eyebrow>
        <p className="m-0 mt-2 text-[15px] text-muted">Mark who showed up. RSVPs are listed first; anyone can be marked attended.</p>
        <AttendanceRoster
          eventId={event.id}
          rows={eligible.map((m) => ({
            uid: m.uid, name: m.name, meta: [m.major, m.teams.map(teamShort).join(", ")].filter(Boolean).join(" · "),
            rsvp: event.rsvpUids.includes(m.uid), attended: event.attendedUids.includes(m.uid), excused: event.excusedUids.includes(m.uid),
          }))}
        />
      </Card>
    </div>
  );
}
