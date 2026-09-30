import { notFound } from "next/navigation";
import { staffPage } from "@/lib/auth/page";
import { getOpportunity, getAllEmployers, getApplicationsForOpportunity } from "@/lib/firebase/portal";
import PostingEditor from "@/components/PostingEditor";
import { isPastDeadline } from "@/lib/models/Portal";

export const dynamic = "force-dynamic";

export default async function PostingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ employer?: string }> }) {
  const member = await staffPage();
  const { id } = await params;
  const { employer } = await searchParams;
  const isNew = id === "new";
  const [opp, employers, apps] = await Promise.all([isNew ? null : getOpportunity(id), getAllEmployers(), isNew ? [] : getApplicationsForOpportunity(id)]);
  if (!isNew && !opp) notFound();

  return (
    <PostingEditor
      uid={member.uid}
      posting={
        opp
          ? {
              id: opp.id, title: opp.title, employerId: opp.employerId, teams: opp.teams, audienceTeams: opp.audienceTeams, commitment: opp.commitment,
              closesAt: opp.closesAt?.toISOString() ?? null, status: opp.status, publishAt: opp.publishAt?.toISOString() ?? null,
              previewImageUrl: opp.previewImageUrl, summary: opp.summary, description: opp.description, requiresTeamResume: opp.requiresTeamResume, pinned: opp.pinned, questions: opp.questions,
              publishedAt: opp.publishedAt?.toISOString() ?? null, updatedAt: opp.updatedAt.toISOString(), updatedByName: opp.updatedByName,
            }
          : null
      }
      defaultEmployerId={employer ?? ""}
      employers={employers.map((e) => ({ id: e.id, name: e.name, teams: e.teams, logoUrl: e.logoUrl }))}
      applicantCount={apps.length}
      projectCount={apps.filter((a) => a.status === "placed" || a.status === "complete").length}
      archived={!!opp && (opp.status === "closed" || isPastDeadline(opp))}
    />
  );
}
