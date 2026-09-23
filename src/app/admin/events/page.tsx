import { getAllEvents } from "@/lib/firebase/portal";
import { splitEvents } from "@/lib/portal/memberData";
import { PageHeader, Pill, Card, Eyebrow, Badge, Row, RowText, Hairline, Empty } from "@/components/ui";
import EventEditor from "@/components/EventEditor";
import { fmtDate, toDateInput } from "@/lib/utils/format";
import ShowMore from "@/components/ShowMore";
import { groupByMonth } from "@/lib/utils/group";

export const dynamic = "force-dynamic";

export default async function AdminEvents({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const events = await getAllEvents();
  const { upcoming, past } = splitEvents(events);
  const selected = id && id !== "new" ? events.find((e) => e.id === id) ?? null : null;
  const editing = id === "new" ? null : selected ?? upcoming[0] ?? past[0] ?? null;
  const editorKey = id === "new" ? "new" : editing?.id ?? "none";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Exec console · Events"
        title="Events"
        actions={
          <>
            <Pill href="/api/admin/events/export" target="_blank">Export attendance</Pill>
            <Pill href="/admin/events?id=new" tone="blue">New event</Pill>
          </>
        }
      />
      <div className="grid items-start gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <Card>
          <Eyebrow>All events</Eyebrow>
          <div className="mt-[18px] flex flex-col gap-5">
            {upcoming.length === 0 && <Empty>Nothing scheduled.</Empty>}
            {groupByMonth(upcoming, (e) => e.startsAt).map((m) => (
              <div key={m.key} className="flex flex-col">
                <p className="t-label mb-2.5">{m.label} · {m.items.length}</p>
                <ShowMore initial={6} label="more" className="flex flex-col gap-2.5" items={m.items.map((e) => (
                  <Row key={e.id} href={`/admin/events?id=${e.id}`} style={editing?.id === e.id ? { outline: "1px solid rgba(96,165,250,0.5)" } : undefined}>
                    <RowText title={e.title} meta={`${fmtDate(e.startsAt)} · ${e.timeLabel} · ${e.location}${e.status === "published" ? ` · ${e.rsvpUids.length} going` : ""}`} />
                    {e.pinned && <Badge tone="accent">Pinned</Badge>}
                    <Badge tone={e.status === "published" ? "ok" : "warn"}>{e.status === "published" ? "Published" : "Draft"}</Badge>
                  </Row>
                ))} />
              </div>
            ))}
          </div>
          <Hairline className="my-5" />
          <Eyebrow>Past</Eyebrow>
          <div className="mt-3.5 flex flex-col">
            {past.length === 0 && <Empty>No past events yet.</Empty>}
            <ShowMore initial={4} label="earlier events" className="flex flex-col gap-2.5" items={past.map((e) => (
              <Row key={e.id} href={`/admin/events/${e.id}/attendance`} style={editing?.id === e.id ? { outline: "1px solid rgba(96,165,250,0.5)" } : undefined}>
                <RowText title={e.title} meta={`${fmtDate(e.startsAt)} · ${e.location} · ${e.attendedUids.length} checked in`} />
                <span className="pill pill-ghost pill-xs">Attendance</span>
              </Row>
            ))} />
          </div>
        </Card>

        <EventEditor
          key={editorKey}
          event={
            editing
              ? {
                  id: editing.id, title: editing.title, date: toDateInput(editing.startsAt), timeLabel: editing.timeLabel, location: editing.location,
                  capacity: editing.capacity, type: editing.type, audienceTeams: editing.audienceTeams, description: editing.description,
                  countsForAttendance: editing.countsForAttendance, pinned: editing.pinned, rsvpUrl: editing.rsvpUrl, status: editing.status, rsvpCount: editing.rsvpUids.length, attendedCount: editing.attendedUids.length,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
