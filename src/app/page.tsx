import Link from "next/link";
import { eventTimeRange } from "@/lib/portal/eventTime";
import { memberPage } from "@/lib/auth/page";
import { visibleOpportunities, visibleEvents, visibleAnnouncements, memberApplications, splitEvents, portalConfig } from "@/lib/portal/memberData";
import { ANNOUNCEMENT_LABEL_TEXT, IN_PROGRESS_STATUSES } from "@/lib/models/Portal";
import { Card, Eyebrow, Badge, Pill, EventMini, Empty, RichText } from "@/components/ui";
import { fmtDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const LABEL_TONE = { pinned: "accent", action: "warn", update: "muted" } as const;

export default async function HomePage() {
  const member = await memberPage("/");
  const [config, opps, apps, events, announcements] = await Promise.all([
    portalConfig(),
    visibleOpportunities(member),
    memberApplications(member),
    visibleEvents(member),
    visibleAnnouncements(member),
  ]);

  const { upcoming } = splitEvents(events);
  const now = new Date();
  const eventsThisMonth = events.filter((e) => e.startsAt.getMonth() === now.getMonth() && e.startsAt.getFullYear() === now.getFullYear()).length;
  const activeApps = apps.filter((a) => IN_PROGRESS_STATUSES.includes(a.status));
  const PROJECT_ORDER = { placed: 0, offer: 1, interview: 2, under_review: 3, submitted: 4 } as const;
  const projects = apps
    .filter((a): a is typeof a & { status: keyof typeof PROJECT_ORDER } => a.status in PROJECT_ORDER)
    .sort((a, b) => PROJECT_ORDER[a.status] - PROJECT_ORDER[b.status] || b.submittedAt.getTime() - a.submittedAt.getTime())
    .slice(0, 3);
  // Pinned always shows; then the three most recent. The rest live on /announcements.
  const featuredAnnouncements = [...announcements.filter((a) => a.label === "pinned"), ...announcements.filter((a) => a.label !== "pinned").slice(0, 3)];
  const newThisWeek = opps.filter((o) => o.publishedAt && now.getTime() - o.publishedAt.getTime() < 7 * 86400000).length;

  const heroLine =
    newThisWeek > 0
      ? `${newThisWeek === 1 ? "One new posting" : `${["", "", "Two", "Three", "Four", "Five"][newThisWeek] ?? newThisWeek} new postings`} went up this week${upcoming[0] ? `, and ${upcoming[0].title} is coming up ${fmtDate(upcoming[0].startsAt)}.` : "."}`
      : upcoming[0]
        ? `Next up: ${upcoming[0].title} on ${fmtDate(upcoming[0].startsAt)}.`
        : "Browse the open postings and keep your resumes current.";

  return (
    <section className="shell pb-16" style={{ paddingTop: 90 }}>
      <div className="flex flex-col gap-5">
        {/* Hero */}
        <div className="card grid items-center" style={{ padding: "36px 40px", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: 32 }}>
          <div>
            <Eyebrow>{config.season} · Week {config.week}</Eyebrow>
            <h1 className="t-h1 mt-3">Welcome back, {member.firstName || member.name.split(" ")[0]}.</h1>
            <p className="lead-text mt-3.5 text-[18px] leading-[1.55] text-muted" style={{ letterSpacing: "-0.02em" }}>{heroLine}</p>
            <div className="hero-ctas mt-6 flex flex-wrap gap-3">
              <Pill href="/opportunities" tone="blue">Browse opportunities</Pill>
              <Pill href="/profile#resumes">Update my resumes</Pill>
            </div>
          </div>
          <div className="stat-grid grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(130px, 100%), 1fr))" }}>
            <div className="tile"><p className="tile-num m-0">{opps.length}</p><p className="m-0 mt-1.5 tile-label text-[13px] text-muted">Open postings</p></div>
            <div className="tile"><p className="tile-num m-0">{activeApps.length}</p><p className="m-0 mt-1.5 tile-label text-[13px] text-muted">Your applications</p></div>
            <div className="tile"><p className="tile-num m-0">{apps.filter((a) => a.status === "placed").length}</p><p className="tile-label m-0 mt-1.5 text-[13px] text-muted">Active {apps.filter((a) => a.status === "placed").length === 1 ? "project" : "projects"}</p></div>
            <div className="tile"><p className="tile-num m-0">{eventsThisMonth}</p><p className="m-0 mt-1.5 tile-label text-[13px] text-muted">Events this month</p></div>
          </div>
        </div>

        <div className="grid items-stretch gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}>
          {/* Announcements */}
          <Card pad={32}>
            <div className="flex items-center justify-between gap-4">
              <Eyebrow>Announcements</Eyebrow>
              {announcements.length > featuredAnnouncements.length && (
                <Link href="/announcements" className="text-[13px] font-semibold text-accent">View all {announcements.length}</Link>
              )}
            </div>
            <div className="mt-5 flex flex-col gap-3">
              {announcements.length === 0 && <Empty>Nothing from exec yet.</Empty>}
              {featuredAnnouncements.map((a) => (
                <div key={a.id} className="row-lg rounded-3xl" style={{ background: "var(--color-surface-2)", padding: "22px 24px" }}>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={LABEL_TONE[a.label]}>{ANNOUNCEMENT_LABEL_TEXT[a.label]}</Badge>
                    <span className="text-[12px] text-muted">{fmtDate(a.publishAt ?? a.createdAt)} · {a.authorName}</span>
                  </div>
                  <p className="m-0 mt-3 text-[20px] font-semibold" style={{ letterSpacing: "-0.02em" }}>{a.title}</p>
                  <div className="clamp-phone"><RichText text={a.body} className="text-muted" firstGap={8} /></div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex min-w-0 flex-col gap-5">
            <Card>
              <Eyebrow>Upcoming events</Eyebrow>
              <div className="mt-[18px] flex flex-col gap-3">
                {upcoming.length === 0 && <Empty>No upcoming events.</Empty>}
                {[...upcoming.filter((e) => e.pinned), ...upcoming.filter((e) => !e.pinned)].slice(0, 3).map((e) => (
                  <Link key={e.id} href="/events" className="block">
                    <EventMini date={e.startsAt} title={e.title} meta={`${eventTimeRange(e)} · ${e.location}`} />
                  </Link>
                ))}
              </div>
            </Card>
            <Card className="flex-1">
              <Eyebrow>Current projects</Eyebrow>
              <div className="mt-[18px] flex flex-col gap-3">
                {projects.length === 0 && <Empty>No projects yet. Apply to a posting to get started.</Empty>}
                {projects.map((a) => (
                  <div key={a.id} className="row" style={{ padding: 18 }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="m-0 text-[15px] font-semibold">{a.employerName} · {a.opportunityTitle}</p>
                      <Badge tone={a.status === "placed" ? "ok" : "warn"}>{a.status === "placed" ? "Active" : "Applied"}</Badge>
                    </div>
                    <p className="m-0 mt-2 text-[13px] text-muted">
                      {a.status === "placed" ? (a.nextStep || `Accepted ${fmtDate(a.decidedAt)}`) : a.nextStep || `Submitted ${fmtDate(a.submittedAt)}`}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
