import { getAllApplications, getAllOpportunities } from "@/lib/firebase/portal";
import { getAllMembers } from "@/lib/firebase/members";
import { teamShort } from "@/lib/models/Member";
import { PageHeader } from "@/components/ui";
import ApplicationsBoard, { BoardRow } from "@/components/ApplicationsBoard";

export const dynamic = "force-dynamic";

/** Every application across every posting, newest first, with filters. */
export default async function AdminApplications() {
  const [apps, members, opps] = await Promise.all([getAllApplications(), getAllMembers(), getAllOpportunities()]);
  const byUid = new Map(members.map((m) => [m.uid, m]));
  const oppTitle = new Map(opps.map((o) => [o.id, o.title]));

  const rows: BoardRow[] = apps.map((a) => {
    const m = byUid.get(a.userId);
    const resume = m?.resumes.find((r) => r.id === a.resumeId);
    return {
      application: { id: a.id, status: a.status, nextStep: a.nextStep, nextStepAt: a.nextStepAt?.toISOString() ?? null, joinLink: a.joinLink, submittedAt: a.submittedAt.toISOString(), resumeFileName: a.resumeFileName, answers: a.answers },
      title: a.userName,
      subtitle: [m ? [m.major, m.major2].filter(Boolean).join(" & ") : "", m?.gradDate ?? "", m ? m.teams.map(teamShort).join(", ") : ""].filter(Boolean).join(" · "),
      memberHref: m ? `/admin/members/${m.uid}` : undefined,
      resumeUrl: resume?.url,
      opportunityId: a.opportunityId,
      opportunityTitle: oppTitle.get(a.opportunityId) ?? a.opportunityTitle,
      employerName: a.employerName,
      status: a.status,
      submittedAt: a.submittedAt.getTime(),
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow={`Exec console · Applications · ${apps.length}`} title="Applications" />
      <ApplicationsBoard rows={rows} postings={opps.map((o) => ({ id: o.id, title: o.title }))} />
    </div>
  );
}
