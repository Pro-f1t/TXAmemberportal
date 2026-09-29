import Link from "next/link";
import { memberPage } from "@/lib/auth/page";
import { memberApplications, portalConfig } from "@/lib/portal/memberData";
import { IN_PROGRESS_STATUSES, APPLICATION_STATUS_LABEL, MemberApplication } from "@/lib/models/Portal";
import { teamShort } from "@/lib/models/Member";
import { PageHeader, Pill, Card, Eyebrow, Badge, Empty, Row } from "@/components/ui";
import OfferActions from "@/components/OfferActions";
import { fmtDate, fmtWeekdayDateTime, gcalLink } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function tone(s: MemberApplication["status"]) {
  return s === "under_review" ? "warn" : s === "interview" ? "accent" : s === "offer" ? "ok" : s === "placed" ? "ok" : s === "declined" ? "danger" : "muted";
}

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const member = await memberPage("/applications");
  const { tab } = await searchParams;
  const past = tab === "past";
  const [config, apps] = await Promise.all([portalConfig(), memberApplications(member)]);

  const inProgress = apps.filter((a) => IN_PROGRESS_STATUSES.includes(a.status));
  const decided = apps.filter((a) => (past ? ["declined", "complete"] : ["placed"]).includes(a.status));
  const shown = past ? apps.filter((a) => ["declined", "complete"].includes(a.status)) : inProgress;
  const next = inProgress.find((a) => a.nextStep && (a.status === "interview" || a.status === "offer")) ?? inProgress.find((a) => a.nextStep) ?? null;

  return (
    <section className="shell pb-16" style={{ paddingTop: 90 }}>
      <div className="flex flex-col gap-5">
        <PageHeader
          eyebrow={`${config.season} · ${apps.length} ${apps.length === 1 ? "application" : "applications"}`}
          title="My applications"
          actions={
            <>
              <Pill href="/applications" tone={past ? "ghost" : "blue"} size="sm">Active</Pill>
              <Pill href="/applications?tab=past" tone={past ? "blue" : "ghost"} size="sm">Past</Pill>
            </>
          }
        />

        <div className="grid items-stretch gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}>
          <Card className="flex flex-col gap-3">
            <Eyebrow>{past ? "Past" : "In progress"}</Eyebrow>
            <div className="mt-1.5 flex flex-col gap-3">
              {shown.length === 0 && (
                <Empty>{past ? "No past applications." : <>Nothing in progress. <Link href="/opportunities" className="text-accent">Browse opportunities</Link>.</>}</Empty>
              )}
              {shown.map((a) => (
                <Row key={a.id} size="lg" href={`/opportunities/${a.opportunityId}`}>
                  <div className="min-w-0" style={{ flex: "1 1 220px" }}>
                    <p className="m-0 text-[17px] font-semibold" style={{ letterSpacing: "-0.02em" }}>{a.opportunityTitle}</p>
                    <p className="m-0 mt-1.5 text-[13px] text-muted">{a.employerName}{a.team ? ` · ${teamShort(a.team)}` : ""} · {a.resumeFileName}</p>
                  </div>
                  <p className="m-0 text-[13px] text-muted" style={{ flex: "1 1 160px" }}>
                    {a.nextStep || `Submitted ${fmtDate(a.submittedAt)}${a.decidedAt ? ` · Decided ${fmtDate(a.decidedAt)}` : ""}`}
                  </p>
                  <Badge tone={tone(a.status)}>{APPLICATION_STATUS_LABEL[a.status]}</Badge>
                </Row>
              ))}
            </div>
          </Card>

          <div className="flex min-w-0 flex-col gap-5">
            <Card>
              <Eyebrow>Next step</Eyebrow>
              {next ? (
                <>
                  <p className="t-title m-0 mt-3.5">
                    {next.status === "offer" ? `Offer from ${next.employerName}` : `${APPLICATION_STATUS_LABEL[next.status]} with ${next.employerName}`}
                  </p>
                  <p className="m-0 mt-2 text-[15px] leading-[1.55] text-muted">
                    {next.nextStepAt ? `${fmtWeekdayDateTime(next.nextStepAt)}. ` : ""}{next.nextStep}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {next.status === "offer" ? (
                      <OfferActions applicationId={next.id} />
                    ) : (
                      <>
                        {next.nextStepAt && <Pill href={gcalLink(`${next.opportunityTitle} · ${next.employerName}`, next.nextStepAt, 30, next.nextStep, next.joinLink)} tone="blue" size="sm" target="_blank">Add to calendar</Pill>}
                        {next.joinLink && <Pill href={next.joinLink} size="sm" target="_blank">Join link</Pill>}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p className="m-0 mt-3.5 text-[15px] leading-[1.55] text-muted">No next step yet. Exec will post interview details here when a posting moves forward.</p>
              )}
            </Card>

            <Card className="flex-1">
              <Eyebrow>Decided</Eyebrow>
              <div className="mt-[18px] flex flex-col gap-3">
                {decided.length === 0 && <Empty>No decisions yet.</Empty>}
                {decided.map((a) => (
                  <div key={a.id} className="row flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="m-0 text-[15px] font-semibold">{a.opportunityTitle}</p>
                      <p className="m-0 mt-1 text-[12px] text-muted">
                        {a.employerName} · {a.status === "placed" ? `Accepted ${fmtDate(a.decidedAt)} · now a current project` : a.status === "complete" ? "Complete" : `Decided ${fmtDate(a.decidedAt)}`}
                      </p>
                    </div>
                    <Badge tone={tone(a.status)}>{APPLICATION_STATUS_LABEL[a.status]}</Badge>
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
