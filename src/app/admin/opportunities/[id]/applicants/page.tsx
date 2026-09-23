import Link from "next/link";
import { notFound } from "next/navigation";
import { getOpportunity, getApplicationsForOpportunity } from "@/lib/firebase/portal";
import { getAllMembers } from "@/lib/firebase/members";
import { resumeForTeam, teamShort } from "@/lib/models/Member";
import { PageHeader, Pill, Card, Eyebrow, Empty } from "@/components/ui";
import ApplicationStatusRow from "@/components/ApplicationStatusRow";

export const dynamic = "force-dynamic";

export default async function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opp = await getOpportunity(id);
  if (!opp) notFound();
  const [apps, members] = await Promise.all([getApplicationsForOpportunity(id), getAllMembers()]);
  const byUid = new Map(members.map((m) => [m.uid, m]));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <Link href="/admin/opportunities" className="font-semibold text-accent">Opportunities</Link>
        <span>/</span>
        <Link href={`/admin/opportunities/${opp.id}`} className="font-semibold text-accent">{opp.title}</Link>
        <span>/</span>
        <span>Applicants</span>
      </div>
      <PageHeader
        eyebrow={`${opp.employerName || "No employer"} · ${opp.teams.map(teamShort).join(", ") || "All teams"}`}
        title={`Applicants · ${apps.length}`}
        actions={<Pill href={`/admin/opportunities/${opp.id}`}>Back to posting</Pill>}
      />
      <Card>
        <Eyebrow>Move each applicant through Under review → Interview → Offer</Eyebrow>
        <div className="mt-[18px] flex flex-col gap-2.5">
          {apps.length === 0 && <Empty>No applications yet.</Empty>}
          {apps.map((a) => {
            const m = byUid.get(a.userId);
            const resume = m ? m.resumes.find((r) => r.id === a.resumeId) ?? resumeForTeam(m, a.team) : null;
            return (
              <ApplicationStatusRow
                key={a.id}
                application={{ id: a.id, status: a.status, nextStep: a.nextStep, nextStepAt: a.nextStepAt?.toISOString() ?? null, joinLink: a.joinLink, submittedAt: a.submittedAt.toISOString(), resumeFileName: a.resumeFileName, answers: a.answers }}
                title={a.userName}
                subtitle={m ? [[m.major, m.major2].filter(Boolean).join(" & "), m.gradDate, m.teams.map(teamShort).join(", ")].filter(Boolean).join(" · ") : ""}
                memberHref={m ? `/admin/members/${m.uid}` : undefined}
                resumeUrl={resume?.url}
              />
            );
          })}
        </div>
      </Card>
    </div>
  );
}
