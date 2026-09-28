import Link from "next/link";
import { eventTimeRange } from "@/lib/portal/eventTime";
import { getAllOpportunities, getAllApplications, getAllEvents, getAllAnnouncements, getPortalConfig } from "@/lib/firebase/portal";
import { isOpportunityLive, closesSoon, isAnnouncementLive, ANNOUNCEMENT_LABEL_TEXT } from "@/lib/models/Portal";
import { splitEvents } from "@/lib/portal/memberData";
import { PageHeader, Pill, Card, Eyebrow, Badge, StatTile, Row, RowText, EventMini, Empty } from "@/components/ui";
import { fmtDate } from "@/lib/utils/format";
import SignupToggle from "@/components/SignupToggle";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [config, opps, apps, events, anns] = await Promise.all([getPortalConfig(), getAllOpportunities(), getAllApplications(), getAllEvents(), getAllAnnouncements()]);
  const live = opps.filter((o) => isOpportunityLive(o) && o.status !== "closed");
  const drafts = opps.filter((o) => o.status === "draft");
  const closing = live.filter((o) => closesSoon(o));
  const weekAgo = Date.now() - 7 * 86400000;
  const newApps = apps.filter((a) => a.submittedAt.getTime() > weekAgo);
  const countFor = (id: string) => apps.filter((a) => a.opportunityId === id).length;
  const { upcoming } = splitEvents(events.filter((e) => e.status === "published"));
  const liveAnns = anns.filter((a) => isAnnouncementLive(a));

  const featured = [...live.sort((a, b) => (a.closesAt?.getTime() ?? Infinity) - (b.closesAt?.getTime() ?? Infinity)).slice(0, 2), ...drafts.slice(0, 1)];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={`Exec console · ${config.season}`}
        title="Overview"
        actions={
          <>
            <Pill href="/admin/opportunities/new" tone="blue">New opportunity</Pill>
            <Pill href="/admin/events?id=new">New event</Pill>
            <Pill href="/admin/announcements?id=new">New announcement</Pill>
          </>
        }
      />

      <SignupToggle requireApproval={config.requireApproval} variant="banner" />

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <StatTile surface={1} value={live.length} label="Live postings" />
        <StatTile surface={1} value={drafts.length} label="Drafts waiting to post" tone={drafts.length ? "warn" : undefined} />
        <StatTile surface={1} value={closing.length} label="Closing this week" />
        <Link href="/admin/applications" className="block"><StatTile surface={1} value={newApps.length} label="New applications" /></Link>
      </div>

      <div className="grid items-stretch gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <Card>
          <div className="flex items-center justify-between gap-4">
            <Eyebrow>Postings</Eyebrow>
            <Link href="/admin/opportunities" className="text-[13px] font-semibold text-accent">View all</Link>
          </div>
          <div className="mt-[18px] flex flex-col gap-2.5">
            {featured.length === 0 && <Empty>No postings yet. Create the first one.</Empty>}
            {featured.map((o) => {
              const n = countFor(o.id);
              return (
                <Row key={o.id} href={`/admin/opportunities/${o.id}`} className="justify-between" wrap>
                  <RowText title={o.title} meta={o.status === "draft" ? `${o.employerName || "No employer"} · not posted yet` : `${o.employerName} · ${o.closesAt ? `closes ${fmtDate(o.closesAt)}` : "rolling"} · ${n} applicant${n === 1 ? "" : "s"}`} />
                  {o.status === "draft" ? <Badge tone="muted">Draft</Badge> : closesSoon(o) ? <Badge tone="warn">Closes soon</Badge> : <Badge tone="ok">Live</Badge>}
                </Row>
              );
            })}
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <div className="flex items-center justify-between gap-4">
              <Eyebrow>Upcoming events</Eyebrow>
              <Link href="/admin/events" className="text-[13px] font-semibold text-accent">View all</Link>
            </div>
            <div className="mt-[18px] flex flex-col gap-2.5">
              {upcoming.length === 0 && <Empty>Nothing scheduled.</Empty>}
              {upcoming.slice(0, 2).map((e) => (
                <Link key={e.id} href={`/admin/events?id=${e.id}`} className="block">
                  <EventMini date={e.startsAt} title={e.title} meta={`${eventTimeRange(e)} · ${e.location} · ${e.rsvpUids.length} registered`} />
                </Link>
              ))}
            </div>
          </Card>
          <Card className="flex-1">
            <div className="flex items-center justify-between gap-4">
              <Eyebrow>Announcements</Eyebrow>
              <Link href="/admin/announcements" className="text-[13px] font-semibold text-accent">View all</Link>
            </div>
            <div className="mt-[18px] flex flex-col gap-2.5">
              {liveAnns.length === 0 && <Empty>Nothing posted.</Empty>}
              {liveAnns.slice(0, 2).map((a) => (
                <Row key={a.id} href={`/admin/announcements?id=${a.id}`} className="justify-between" style={{ padding: "14px 18px" }}>
                  <p className="m-0 text-[15px] font-semibold">{a.title}</p>
                  <span className="text-[12px] text-muted">{fmtDate(a.publishAt ?? a.createdAt)}{a.label === "pinned" ? " · Pinned" : ""}</span>
                </Row>
              ))}
              {liveAnns.length === 0 ? null : <span className="sr-only">{ANNOUNCEMENT_LABEL_TEXT.pinned}</span>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
