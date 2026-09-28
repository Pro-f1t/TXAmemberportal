import { memberPage } from "@/lib/auth/page";
import { eventTimeRange } from "@/lib/portal/eventTime";
import { visibleEvents, splitEvents, memberApplications } from "@/lib/portal/memberData";
import { teamShort } from "@/lib/models/Member";
import { Card, Eyebrow, Badge, Empty, EventMini, Hairline } from "@/components/ui";
import ProfileCard from "@/components/ProfileCard";
import ResumeManager from "@/components/ResumeManager";
import { fmtDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const member = await memberPage("/profile");
  const [events, apps] = await Promise.all([visibleEvents(member), memberApplications(member)]);
  const { upcoming } = splitEvents(events);
  const projects = apps.filter((a) => ["placed", "under_review", "interview", "offer", "submitted", "complete"].includes(a.status)).slice(0, 4);

  return (
    <section className="shell pb-16" style={{ paddingTop: 90 }}>
      <div className="grid items-stretch gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <Card className="flex flex-col">
          <ProfileCard
            member={{
              uid: member.uid, name: member.name, firstName: member.firstName, lastName: member.lastName, email: member.email,
              phone: member.phone, eid: member.eid, linkedin: member.linkedin, major: member.major, major2: member.major2, gradDate: member.gradDate,
              teams: member.teams, photoUrl: member.photoUrl, memberSince: fmtDate(member.memberSince) ? member.memberSince.toISOString() : "",
            }}
          />
          <Hairline className="mt-7 mb-6" />
          <Eyebrow>Upcoming events</Eyebrow>
          <div className="mt-[18px] flex flex-col gap-3">
            {upcoming.length === 0 && <Empty>No upcoming events.</Empty>}
            {upcoming.slice(0, 3).map((e) => (
              <EventMini key={e.id} date={e.startsAt} title={e.title} meta={`${eventTimeRange(e)} · ${e.location} · ${e.rsvpUids.includes(member.uid) ? "Registered" : "Signup open"}`} />
            ))}
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <div id="resumes">
            <ResumeManager
              uid={member.uid}
              resumes={member.resumes.map((r) => ({ id: r.id, fileName: r.fileName, url: r.url, size: r.size, uploadedAt: r.uploadedAt.toISOString(), assignedTeams: r.assignedTeams, isDefault: r.isDefault }))}
              memberTeams={member.teams}
            />
          </div>
          <Card className="flex-1">
            <Eyebrow>Current projects</Eyebrow>
            <div className="mt-[18px] flex flex-col gap-3">
              {projects.length === 0 && <Empty>No projects yet.</Empty>}
              {projects.map((a) => (
                <div key={a.id} className="row" style={{ padding: "18px 20px" }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="m-0 text-[16px] font-semibold">{a.opportunityTitle} · {a.employerName}</p>
                    <Badge tone={a.status === "placed" ? "ok" : a.status === "complete" ? "muted" : "warn"}>{a.status === "placed" ? "Active" : a.status === "complete" ? "Complete" : "Applied"}</Badge>
                  </div>
                  <p className="m-0 mt-2 text-[13px] text-muted">
                    {a.team ? `${teamShort(a.team)} · ` : ""}{a.nextStep || (a.status === "complete" ? `Shipped ${fmtDate(a.decidedAt)}` : `Submitted ${fmtDate(a.submittedAt)}`)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
