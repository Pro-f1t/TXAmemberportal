import { displayAllowed } from "@/lib/attendance/displayAuth";
import { checkinConfigured } from "@/lib/attendance/token";
import { getEvent } from "@/lib/firebase/portal";
import { EVENT_TYPE_LABEL } from "@/lib/models/Portal";
import { eventTimeRange } from "@/lib/portal/eventTime";
import { getBaseUrl } from "@/lib/utils/baseUrl";
import { fmtDate } from "@/lib/utils/format";
import LiveCheckin from "@/components/LiveCheckin";

export const dynamic = "force-dynamic";

function Message({ title, body }: { title: string; body: string }) {
  return (
    <section className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="t-eyebrow">Check-in</p>
      <h1 className="t-card-title">{title}</h1>
      <p className="t-body max-w-md text-muted">{body}</p>
    </section>
  );
}

/**
 * The projector screen. Always for one explicit event (opened from the console's
 * Attendance tab) — never auto-selected. Open to a signed-in exec, or to anyone
 * holding the projector link (?k=DISPLAY_KEY). Nav and footer are hidden here.
 * Must stay OUT of the proxy matcher — see src/proxy.ts.
 */
export default async function LiveDisplayPage({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ k?: string }> }) {
  const [{ eventId }, { k }] = await Promise.all([params, searchParams]);
  if (!(await displayAllowed(k))) return <Message title="Sign in or use the projector link" body="Open this screen from Console → Attendance, or with the projector link copied from there." />;
  if (!checkinConfigured()) return <Message title="Check-in isn't set up" body="CHECKIN_SECRET is missing from the server's environment variables." />;
  const event = await getEvent(eventId);
  if (!event || event.status !== "published") return <Message title="Event not found" body="This event doesn't exist or isn't published." />;

  return (
    <LiveCheckin
      eventId={event.id}
      eventTitle={event.title}
      eventMeta={`${EVENT_TYPE_LABEL[event.type]} · ${fmtDate(event.startsAt)} · ${eventTimeRange(event)} · ${event.location}`}
      displayKey={k ?? ""}
      base={await getBaseUrl()}
    />
  );
}
