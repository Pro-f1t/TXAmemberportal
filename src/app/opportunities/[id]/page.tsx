import Link from "next/link";
import { notFound } from "next/navigation";
import { memberPage } from "@/lib/auth/page";
import { getOpportunity, getApplicationsForMember, getEmployer } from "@/lib/firebase/portal";
import { isOpportunityLive, isPastDeadline, closesSoon, APPLICATION_STATUS_LABEL } from "@/lib/models/Portal";
import { teamShort, visibleTo, resumeForTeam } from "@/lib/models/Member";
import { isStaff } from "@/lib/auth/guard";
import { Card, Eyebrow, Badge, Chip, ArtImage, Hairline, Pill } from "@/components/ui";
import ApplyPanel from "@/components/ApplyPanel";
import { fmtDateYear } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await memberPage(`/opportunities/${id}`);
  const opp = await getOpportunity(id);
  if (!opp) notFound();
  // Members only see live postings for their teams; staff can preview anything.
  if (!isStaff(member) && (!isOpportunityLive(opp) || !visibleTo(opp.audienceTeams, member.teams))) notFound();

  const [apps, employer] = await Promise.all([getApplicationsForMember(member.uid), opp.employerId ? getEmployer(opp.employerId) : null]);
  const site = employer?.website ? (employer.website.startsWith("http") ? employer.website : `https://${employer.website}`) : "";
  const existing = apps.find((a) => a.opportunityId === opp.id) ?? null;
  const open = isOpportunityLive(opp) && !isPastDeadline(opp);
  const primaryTeam = opp.teams[0] ?? null;
  const preselected = resumeForTeam(member, primaryTeam);

  return (
    <section className="shell pb-16" style={{ paddingTop: 90 }}>
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <Link href="/opportunities" className="font-semibold text-accent">Opportunities</Link>
        <span>/</span>
        <span>{opp.title}</span>
      </div>

      <div className="mt-5 grid items-start gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <Card className="lg:col-span-2" style={{ padding: "36px clamp(24px, 3vw, 40px)" }}>
          <div className="flex flex-wrap items-center gap-2.5">
            {existing ? <Badge tone="accent">{APPLICATION_STATUS_LABEL[existing.status]}</Badge> : closesSoon(opp) ? <Badge tone="warn">Closes soon</Badge> : open ? <Badge tone="ok">Open</Badge> : <Badge tone="muted">Closed</Badge>}
            <span className="text-[13px] text-muted">
              {opp.employerName}{opp.closesAt ? ` · Apply by ${fmtDateYear(opp.closesAt)}` : " · Rolling"}
            </span>
          </div>
          <h1 className="mt-5 font-semibold" style={{ fontSize: "clamp(26px, 3vw, 36px)", lineHeight: 1.29, letterSpacing: "-0.02em" }}>{opp.title}</h1>

          <div className="mt-6 flex flex-col gap-0.5">
            <Prop label="Employer">
              {site ? (
                <a href={site} target="_blank" rel="noreferrer" className="text-[15px] font-medium text-accent hover:text-white">{opp.employerName} ↗</a>
              ) : (
                <span className="text-[15px] font-medium">{opp.employerName || "—"}</span>
              )}
              {employer?.location && <span className="text-[13px] text-muted">{employer.location}</span>}
            </Prop>
            <Prop label="Field teams">
              <span className="flex flex-wrap gap-2">{opp.teams.map((t) => <Chip key={t}>{teamShort(t)}</Chip>)}</span>
            </Prop>
            <Prop label="Commitment"><span className="text-[15px] font-medium">{opp.commitment || "—"}</span></Prop>
            {opp.previewImageUrl && (
              <Prop label="Preview">
                <ArtImage src={opp.previewImageUrl} alt={opp.employerName} className="rounded-2xl" style={{ width: 220, height: 120 }} />
              </Prop>
            )}
          </div>

          <Hairline className="my-6" />
          <Eyebrow>Summary</Eyebrow>
          <p className="m-0 mt-3 text-[18px] leading-[1.55]" style={{ letterSpacing: "-0.02em" }}>{opp.summary}</p>
          <Eyebrow className="mt-7">Job description</Eyebrow>
          {opp.description.split(/\n\s*\n/).filter(Boolean).map((para, i) => (
            <p key={i} className="m-0 text-[16px] leading-[1.55] text-muted" style={{ marginTop: i === 0 ? 12 : 14 }}>{para}</p>
          ))}
          {isStaff(member) && (
            <div className="mt-7"><Pill href={`/admin/opportunities/${opp.id}`} size="sm">Edit in console</Pill></div>
          )}
        </Card>

        <ApplyPanel
          opportunityId={opp.id}
          open={open}
          resumes={member.resumes.map((r) => ({ id: r.id, fileName: r.fileName, teams: r.assignedTeams.map(teamShort), isDefault: r.isDefault }))}
          preselectedId={preselected?.id ?? null}
          primaryTeam={primaryTeam ? teamShort(primaryTeam) : null}
          questions={opp.questions}
          existing={existing ? { status: existing.status, label: APPLICATION_STATUS_LABEL[existing.status], resumeFileName: existing.resumeFileName, submittedAt: fmtDateYear(existing.submittedAt), nextStep: existing.nextStep } : null}
        />
      </div>
    </section>
  );
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 py-2">
      <span className="shrink-0 text-[13px] text-muted" style={{ width: 150 }}>{label}</span>
      {children}
    </div>
  );
}
