import { memberPage } from "@/lib/auth/page";
import { eventTimeRange, eventEnded } from "@/lib/portal/eventTime";
import { visibleEvents, splitEvents, attendanceState, attendedCount, portalConfig } from "@/lib/portal/memberData";
import { EVENT_TYPE_LABEL, EventType } from "@/lib/models/Portal";
import { PageHeader, Pill, Card, Eyebrow, Badge, Empty, Tone } from "@/components/ui";
import RsvpButton from "@/components/RsvpButton";
import EventRow from "@/components/EventRow";
import { fmtDate } from "@/lib/utils/format";
import ShowMore from "@/components/ShowMore";
import Archive from "@/components/Archive";
import { groupByMonth } from "@/lib/utils/group";
import { getBaseUrl } from "@/lib/utils/baseUrl";

export const dynamic = "force-dynamic";

const TYPE_TONE: Record<EventType, Tone> = { gm: "violet", workshop: "ok", profdev: "warn", social: "accent", info: "muted", company: "danger" };

export default async function EventsPage() {
  const member = await memberPage("/events");
  const [config, events] = await Promise.all([portalConfig(), visibleEvents(member)]);
  const { upcoming, past } = splitEvents(events);
  const attended = attendedCount(events, member.uid);
  const pinnedUpcoming = upcoming.filter((e) => e.pinned);
  // Pinned sits above the months; the current month shows 8 rows, later months 4.
  const monthGroups = groupByMonth(upcoming.filter((e) => !e.pinned), (e) => e.startsAt);
  // Google Calendar's add-by-URL flow, pointed at the public feed (or a shared
  // Google Calendar link if exec set one in config/portal.calendarUrl).
  const feedUrl = `${await getBaseUrl()}/api/events/calendar.ics`;
  const calendarHref = config.calendarUrl || `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`;

  return (
    <section className="shell pb-16" style={{ paddingTop: 90 }}>
      <div className="flex flex-col gap-5">
        <PageHeader
          eyebrow={config.season}
          title="Events"
          actions={<Pill href={calendarHref} target="_blank">Subscribe to Google Calendar</Pill>}
        />

        <div className="grid items-stretch gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <Card>
            <Eyebrow>Upcoming</Eyebrow>
            <div className="mt-[18px] flex flex-col gap-5">
              {upcoming.length === 0 && <Empty>No upcoming events yet.</Empty>}
              {[...(pinnedUpcoming.length ? [{ key: "pinned", label: "Pinned", items: pinnedUpcoming }] : []), ...monthGroups].map((m) => (
                <div key={m.key} className="flex flex-col">
                  <p className="t-label mb-3">{m.label} · {m.items.length}</p>
                  <ShowMore initial={m.key === "pinned" ? 99 : m.key === monthGroups[0]?.key ? 8 : 4} label="more this month" className="flex flex-col gap-3" items={m.items.map((e) => {
                const going = e.rsvpUids.includes(member.uid);
                const full = e.capacity !== null && e.rsvpUids.length >= e.capacity && !going;
                return (
                  <EventRow
                    key={e.id}
                    date={e.startsAt}
                    title={e.title}
                    meta={`${eventTimeRange(e)} · ${e.location}${full ? " · Full" : ""}`}
                    description={e.description}
                    badges={[{ label: EVENT_TYPE_LABEL[e.type], tone: TYPE_TONE[e.type] }, ...(e.pinned ? [{ label: "Pinned", tone: "accent" as Tone }] : [])]}
                    action={
                      eventEnded(e)
                        ? <Badge tone={e.attendedUids.includes(member.uid) ? "ok" : "muted"}>{e.attendedUids.includes(member.uid) ? "Attended" : "Ended"}</Badge>
                        : e.rsvpUrl ? <a href={e.rsvpUrl} target="_blank" rel="noreferrer" className="pill pill-blue pill-sm">RSVP ↗</a> : <RsvpButton eventId={e.id} going={going} disabled={full} />
                    }
                  />
                );
              })} />
                </div>
              ))}
            </div>
            <Archive count={past.length}>
              {past.map((e) => {
                const s = attendanceState(e, member.uid);
                return (
                  <div key={e.id} className="row flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="m-0 text-[15px] font-semibold">{e.title}</p>
                      <p className="m-0 mt-1 text-[12px] text-muted">{fmtDate(e.startsAt)} · {e.location}</p>
                    </div>
                    <Badge tone={s === "attended" ? "ok" : s === "excused" ? "muted" : "danger"}>{s === "attended" ? "Attended" : s === "excused" ? "Excused" : "Missed"}</Badge>
                  </div>
                );
              })}
            </Archive>
          </Card>

          <div className="flex min-w-0 flex-col gap-5">
            <Card>
              <Eyebrow>Your attendance</Eyebrow>
              <div className="mt-3.5 flex items-baseline gap-3">
                <span className="text-[44px] font-semibold leading-none" style={{ letterSpacing: "-0.02em" }}>{attended}</span>
                <span className="text-[15px] text-muted">{attended === 1 ? "event" : "events"} attended this semester</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
