import Link from "next/link";
import { eventTimeRange } from "@/lib/portal/eventTime";
import { notFound } from "next/navigation";
import { memberPage } from "@/lib/auth/page";
import { getMember } from "@/lib/firebase/members";
import { getAllEvents, getApplicationsForMember } from "@/lib/firebase/portal";
import { splitEvents } from "@/lib/portal/memberData";
import { STAFF_ROLES, teamShort } from "@/lib/models/Member";
import { EVENT_TYPE_LABEL } from "@/lib/models/Portal";
import { Card, Eyebrow, Badge, Chip, Hairline, KeyValue, Pill, EventMini, Empty } from "@/components/ui";
import { fmtMonthYear, fmtDate, initials } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Another member's profile. Public within the org: name, photo, major, teams,
 * email, LinkedIn, the events they've RSVP'd to, and current projects.
 * Never resumes, phone, EID, or in-progress applications.
 */
export default async function MemberProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const viewer = await memberPage(`/members/${uid}`);
  const [m, events, apps] = await Promise.all([getMember(uid), getAllEvents(), getApplicationsForMember(uid)]);
  if (!m || m.status !== "active") notFound();

  const { upcoming, past } = splitEvents(events.filter((e) => e.status === "published"));
  const going = upcoming.filter((e) => e.rsvpUids.includes(uid));
  const attended = past.filter((e) => e.attendedUids.includes(uid)).length;
  const projects = apps.filter((a) => a.status === "placed" || a.status === "complete");
  const role = STAFF_ROLES.includes(m.role) ? "Exec" : m.role === "lead" ? "Field team lead" : "Member";
  const linkedin = m.linkedin ? (m.linkedin.startsWith("http") ? m.linkedin : `https://${m.linkedin}`) : "";

  return (
    <section className="shell pb-16" style={{ paddingTop: 90 }}>
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <Link href="/members" className="font-semibold text-accent">Members</Link>
        <span>/</span>
        <span>{m.name}</span>
      </div>
      <div className="mt-5 grid items-start gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <Card className="flex flex-col">
          <span className="flex items-center justify-center overflow-hidden rounded-3xl text-[36px] font-semibold text-accent" style={{ width: 160, height: 200, background: "var(--color-surface-2)", letterSpacing: "-0.03em" }}>
            {m.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.photoUrl} alt={m.name} className="h-full w-full object-cover object-top" />
            ) : initials(m.name)}
          </span>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <h2 className="t-h2">{m.name}</h2>
            {role !== "Member" && <Badge tone="accent">{role}</Badge>}
          </div>
          <p className="m-0 mt-2 text-[16px] text-muted">
            {[[m.major, m.major2].filter(Boolean).join(" & "), `Member since ${fmtMonthYear(m.memberSince)}`].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {m.teams.length === 0 && <span className="text-[13px] text-muted">No field teams yet</span>}
            {m.teams.map((t) => <Chip key={t} on size="lg">{teamShort(t)}</Chip>)}
          </div>
          <Hairline className="my-6" />
          <div className="flex flex-col gap-3.5">
            <KeyValue k="Email" v={<a href={`mailto:${m.email}`} className="text-white hover:text-accent">{m.email}</a>} />
            <KeyValue k="LinkedIn" v={linkedin ? <a href={linkedin} target="_blank" rel="noreferrer" className="text-white hover:text-accent">{m.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com/, "")} ↗</a> : ""} />
            <KeyValue k="Events attended" v={String(attended)} />
          </div>
          {viewer.uid === m.uid && <div className="mt-7"><Pill href="/profile">Edit my profile</Pill></div>}
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <Eyebrow>Going to · {going.length}</Eyebrow>
            <div className="mt-[18px] flex flex-col gap-3">
              {going.length === 0 && <Empty>Not signed up for anything yet.</Empty>}
              {going.map((e) => (
                <Link key={e.id} href="/events" className="block">
                  <EventMini date={e.startsAt} title={e.title} meta={`${eventTimeRange(e)} · ${e.location} · ${EVENT_TYPE_LABEL[e.type]}`} />
                </Link>
              ))}
            </div>
          </Card>
          <Card className="flex-1">
            <Eyebrow>Current projects</Eyebrow>
            <div className="mt-[18px] flex flex-col gap-3">
              {projects.length === 0 && <Empty>No projects yet.</Empty>}
              {projects.map((a) => (
                <div key={a.id} className="row" style={{ padding: "18px 20px" }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="m-0 text-[16px] font-semibold">{a.opportunityTitle} · {a.employerName}</p>
                    <Badge tone={a.status === "placed" ? "ok" : "muted"}>{a.status === "placed" ? "Active" : "Complete"}</Badge>
                  </div>
                  <p className="m-0 mt-2 text-[13px] text-muted">{[a.team ? teamShort(a.team) : "", a.decidedAt ? `Since ${fmtDate(a.decidedAt)}` : ""].filter(Boolean).join(" · ")}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
