import QRCode from "qrcode";
import { staffPage } from "@/lib/auth/page";
import { getAllEvents } from "@/lib/firebase/portal";
import { foldCheckins, getBackupState } from "@/lib/firebase/checkins";
import { checkinConfigured } from "@/lib/attendance/token";
import { eventArchived, eventTimeRange } from "@/lib/portal/eventTime";
import { EVENT_TYPE_LABEL } from "@/lib/models/Portal";
import { getBaseUrl } from "@/lib/utils/baseUrl";
import { fmtDate } from "@/lib/utils/format";
import { PageHeader, Card, Eyebrow, Empty, Pill, Row, RowText } from "@/components/ui";
import AttendanceEventRow from "@/components/AttendanceEventRow";
import ShowMore from "@/components/ShowMore";

export const dynamic = "force-dynamic";

const RECENT_DAYS = 30;

/**
 * Console → Attendance (top bar). One row per current/upcoming event with the
 * live display, projector link, roster, and a hidden-until-opened backup code.
 * Loading this page merges any QR check-ins that haven't landed on events yet.
 */
export default async function AttendancePage() {
  await staffPage();
  await foldCheckins();
  const [events, backup, base] = await Promise.all([getAllEvents(), getBackupState(), getBaseUrl()]);
  const published = events.filter((e) => e.status === "published");
  const now = Date.now();
  const current = published.filter((e) => !eventArchived(e, now)).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const recent = published
    .filter((e) => eventArchived(e, now) && now - e.startsAt.getTime() < RECENT_DAYS * 86400000)
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  const displayKey = process.env.DISPLAY_KEY || "";
  const configured = checkinConfigured();

  // Static backup codes, rendered once here and only shown when an exec opens and arms one.
  const backupSvgs = Object.fromEntries(
    await Promise.all(current.map(async (e) => [e.id, await QRCode.toString(`${base}/checkin/${e.id}`, { type: "svg", margin: 2, color: { dark: "#08050f", light: "#ffffff" } })] as const)),
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Exec console · Attendance" title="Attendance" actions={<><Pill href="/api/admin/attendance/export" target="_blank" tone="blue">Export to Excel</Pill><Pill href="/admin/events">All events</Pill></>} />

      {!configured && (
        <Card>
          <p className="m-0 text-[15px] font-semibold" style={{ color: "var(--color-warn)" }}>QR check-in is off</p>
          <p className="m-0 mt-1 text-[14px] text-muted">Set CHECKIN_SECRET (and DISPLAY_KEY for the projector link) in the environment variables, then redeploy. Marking attendance on the roster still works.</p>
        </Card>
      )}

      <Card>
        <Eyebrow>Now and upcoming · {current.length}</Eyebrow>
        <p className="m-0 mt-2 text-[15px] text-muted">
          Open the live display on the projector at the start of the event.
        </p>
        {current.length === 0 && <div className="mt-5"><Empty>No upcoming events. Publish one under Events.</Empty></div>}
        <ShowMore initial={6} label="more upcoming events" className="mt-5 flex flex-col gap-3" items={current.map((e) => (
            <AttendanceEventRow
              key={e.id}
              event={{
                id: e.id, title: e.title, date: e.startsAt.toISOString(),
                meta: `${EVENT_TYPE_LABEL[e.type]} · ${eventTimeRange(e)} · ${e.location}`,
                attended: e.attendedUids.length, rsvps: e.rsvpUids.length,
              }}
              projectorUrl={displayKey ? `${base}/live/${e.id}?k=${encodeURIComponent(displayKey)}` : ""}
              backupSvg={backupSvgs[e.id]}
              backupRemainingMs={backup[e.id] ?? 0}
              disabled={!configured}
            />
          ))} />
      </Card>

      <Card>
        <Eyebrow>Recent · last {RECENT_DAYS} days</Eyebrow>
        <div className="mt-4 flex flex-col gap-2.5">
          {recent.length === 0 && <Empty>Nothing in the last month.</Empty>}
          {recent.map((e) => (
            <Row key={e.id} href={`/admin/events/${e.id}/attendance`}>
              <RowText title={e.title} meta={`${fmtDate(e.startsAt)} · ${eventTimeRange(e)} · ${e.location}`} />
              <span className="text-[13px] text-muted">{e.attendedUids.length} attended</span>
            </Row>
          ))}
        </div>
      </Card>
    </div>
  );
}
