import Link from "next/link";
import { memberPage } from "@/lib/auth/page";
import { visibleOpportunities, memberApplications, portalConfig } from "@/lib/portal/memberData";
import { closesSoon, POSTING_IMAGE_ASPECT } from "@/lib/models/Portal";
import { teamShort } from "@/lib/models/Member";
import { PageHeader, Pill, Badge, Chip, ArtImage, ArrowCircle, Empty } from "@/components/ui";
import { fmtDate } from "@/lib/utils/format";
import ShowMore from "@/components/ShowMore";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const member = await memberPage("/opportunities");
  const { sort } = await searchParams;
  const byDeadline = sort === "deadline";
  const [config, opps, apps] = await Promise.all([portalConfig(), visibleOpportunities(member), memberApplications(member)]);
  const applied = new Set(apps.map((a) => a.opportunityId));

  const sorted = [...opps].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (byDeadline) {
      const ad = a.closesAt?.getTime() ?? Infinity;
      const bd = b.closesAt?.getTime() ?? Infinity;
      return ad - bd;
    }
    return (b.publishedAt ?? b.createdAt).getTime() - (a.publishedAt ?? a.createdAt).getTime();
  });

  return (
    <section className="shell pb-16" style={{ paddingTop: 90 }}>
      <div className="flex flex-col gap-5">
        <PageHeader
          eyebrow={`${config.season} · ${opps.length} open`}
          title="Opportunities"
          actions={
            <>
              <Pill href="/opportunities" tone={byDeadline ? "ghost" : "blue"} size="sm">Newest</Pill>
              <Pill href="/opportunities?sort=deadline" tone={byDeadline ? "blue" : "ghost"} size="sm">Deadline</Pill>
            </>
          }
        />

        {sorted.length === 0 ? (
          <div className="card p-7"><Empty>No open postings for your teams right now. Check back after the next announcement.</Empty></div>
        ) : (
          <ShowMore initial={12} label="more postings" className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))" }} items={sorted.map((o, i) => {
              const soon = closesSoon(o);
              return (
                <Link key={o.id} href={`/opportunities/${o.id}`} className="card flex min-w-0 flex-col gap-3.5 transition-colors" style={{ padding: 20 }}>
                  <ArtImage src={o.previewImageUrl} seed={i} alt={o.employerName} className="w-full rounded-2xl" style={{ aspectRatio: POSTING_IMAGE_ASPECT }} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Chip size="lg">{o.teams[0] ? teamShort(o.teams[0]) : "All teams"}</Chip>
                    <span className="flex flex-wrap items-center gap-2">
                      {o.pinned && <Badge tone="accent">Pinned</Badge>}
                      {applied.has(o.id) ? <Badge tone="accent">Applied</Badge> : soon ? <Badge tone="warn">Closes soon</Badge> : <Badge tone="ok">Open</Badge>}
                    </span>
                  </div>
                  <p className="m-0 text-[19px] font-bold leading-[1.2]" style={{ letterSpacing: "-0.02em" }}>{o.title}</p>
                  <p className="clamp-2-phone m-0 text-[14px] leading-[1.5] text-muted">{o.summary}</p>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                    <span className="text-[13px] text-muted">
                      {o.commitment.split(" · ")[0] || "Flexible"} · {o.closesAt ? `Apply by ${fmtDate(o.closesAt)}` : "Rolling"}
                    </span>
                    <ArrowCircle on={i === 0 || o.pinned} />
                  </div>
                </Link>
              );
            })} />
        )}
      </div>
    </section>
  );
}
