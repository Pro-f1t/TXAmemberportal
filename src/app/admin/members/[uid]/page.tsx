import Link from "next/link";
import { notFound } from "next/navigation";
import { staffPage } from "@/lib/auth/page";
import { getMember } from "@/lib/firebase/members";
import { getApplicationsForMember, getAllEvents } from "@/lib/firebase/portal";
import { teamShort } from "@/lib/models/Member";
import { splitEvents, attendanceState } from "@/lib/portal/memberData";
import { PageHeader, Pill, Card, Eyebrow, Empty } from "@/components/ui";
import MemberEditor from "@/components/MemberEditor";
import ApplicationStatusRow from "@/components/ApplicationStatusRow";
import MemberEvents from "@/components/MemberEvents";
import { fmtDate, fmtMonthYear } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function MemberDetail({ params }: { params: Promise<{ uid: string }> }) {
  const actor = await staffPage();
  const { uid } = await params;
  const [m, apps, events] = await Promise.all([getMember(uid), getApplicationsForMember(uid), getAllEvents()]);
  if (!m) notFound();
  const published = events.filter((e) => e.status === "published");
  const { upcoming, past } = splitEvents(published);
  const attended = past.filter((e) => e.countsForAttendance && e.attendedUids.includes(uid)).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <Link href="/admin/members" className="font-semibold text-accent">Members</Link>
        <span>/</span>
        <span>{m.name}</span>
      </div>
      <PageHeader
        eyebrow={`Member since ${fmtMonthYear(m.memberSince)}${m.eid ? ` · ${m.eid}` : ""}${m.status !== "active" ? ` · ${m.status}` : ""}`}
        title={m.name}
        actions={
          <>
            <Pill href={`mailto:${m.email}`}>Message</Pill>
            <Pill href="#role">Change role</Pill>
            <Pill href="#save" tone="blue">Save changes</Pill>
          </>
        }
      />
      <div className="grid items-stretch gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <MemberEditor
          actorIsAdmin={actor.role === "admin"}
          actorUid={actor.uid}
          member={{
            uid: m.uid, firstName: m.firstName, lastName: m.lastName, name: m.name, eid: m.eid, email: m.email, phone: m.phone, major: m.major, major2: m.major2, gradDate: m.gradDate,
            linkedin: m.linkedin, teams: m.teams, role: m.role, director: m.director, title: m.title, status: m.status,
            resumes: m.resumes.map((r) => ({ id: r.id, fileName: r.fileName, url: r.url, size: r.size, uploadedAt: r.uploadedAt.toISOString(), assignedTeams: r.assignedTeams, isDefault: r.isDefault })),
          }}
        />
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <Eyebrow>Applications · {apps.length}</Eyebrow>
            <div className="mt-[18px] flex flex-col gap-2.5">
              {apps.length === 0 && <Empty>No applications yet.</Empty>}
              {apps.map((a) => (
                <ApplicationStatusRow
                  key={a.id}
                  application={{ id: a.id, status: a.status, nextStep: a.nextStep, nextStepAt: a.nextStepAt?.toISOString() ?? null, joinLink: a.joinLink, submittedAt: a.submittedAt.toISOString(), resumeFileName: a.resumeFileName, answers: a.answers }}
                  title={a.opportunityTitle}
                  subtitle={[a.employerName, a.team ? teamShort(a.team) : ""].filter(Boolean).join(" · ")}
                  memberHref={`/admin/opportunities/${a.opportunityId}/applicants`}
                  resumeUrl={m.resumes.find((r) => r.id === a.resumeId)?.url}
                />
              ))}
            </div>
          </Card>
          <MemberEvents
            uid={uid}
            attended={attended}
            rows={[...past, ...upcoming].map((e) => ({ id: e.id, title: e.title, meta: `${fmtDate(e.startsAt)} · ${e.location}${e.rsvpUids.includes(uid) && attendanceState(e, uid) === "upcoming" ? " · RSVP'd" : ""}`, state: attendanceState(e, uid), counts: e.countsForAttendance }))}
          />
        </div>
      </div>
    </div>
  );
}
