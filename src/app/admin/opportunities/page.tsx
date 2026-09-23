import { getAllOpportunities, getAllApplications } from "@/lib/firebase/portal";
import { closesSoon, isPastDeadline, OPPORTUNITY_STATUS_LABEL } from "@/lib/models/Portal";
import { teamShort } from "@/lib/models/Member";
import { PageHeader, Pill, Card, Eyebrow, Badge, Row, RowText, Empty } from "@/components/ui";
import ReopenButton from "@/components/ReopenButton";
import { fmtDate } from "@/lib/utils/format";
import ShowMore from "@/components/ShowMore";

export const dynamic = "force-dynamic";

export default async function AdminOpportunities({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams;
  const [opps, apps] = await Promise.all([getAllOpportunities(), getAllApplications()]);
  const drafts = opps.filter((o) => o.status === "draft");
  const archived = opps.filter((o) => o.status === "closed" || isPastDeadline(o));
  // Default view is the working set: live, scheduled, and draft. Closed and
  // past-deadline postings live behind the Archived pill.
  const active = opps.filter((o) => !archived.includes(o));
  const shown = [...(filter === "drafts" ? drafts : filter === "archived" ? archived : active)].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const countFor = (id: string) => apps.filter((a) => a.opportunityId === id).length;
  const placedFor = (id: string) => apps.filter((a) => a.opportunityId === id && a.status === "placed").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Exec console · Opportunities"
        title="Opportunities"
        actions={
          <>
            <Pill href={filter === "drafts" ? "/admin/opportunities" : "/admin/opportunities?filter=drafts"} tone={filter === "drafts" ? "blue" : "ghost"}>Drafts · {drafts.length}</Pill>
            <Pill href={filter === "archived" ? "/admin/opportunities" : "/admin/opportunities?filter=archived"} tone={filter === "archived" ? "blue" : "ghost"}>Archived · {archived.length}</Pill>
            <Pill href="/admin/opportunities/new" tone="blue">New opportunity</Pill>
          </>
        }
      />
      <Card>
        <Eyebrow>{filter === "drafts" ? "Drafts" : filter === "archived" ? "Archived" : "Current postings"} · {shown.length}</Eyebrow>
        <div className="mt-[18px] flex flex-col">
          {shown.length === 0 && <Empty>Nothing here yet.</Empty>}
          <ShowMore initial={10} label="more postings" className="flex flex-col gap-2.5" items={shown.map((o) => {
            const closed = o.status === "closed" || isPastDeadline(o);
            const n = countFor(o.id);
            const when =
              o.status === "draft" ? "not posted yet"
              : o.status === "scheduled" ? `posts ${fmtDate(o.publishAt)}`
              : closed ? `closed ${fmtDate(o.closesAt) || ""}`.trim()
              : o.closesAt ? `closes ${fmtDate(o.closesAt)}` : "rolling";
            const meta = [o.employerName || "No employer", ...o.teams.map(teamShort), when].join(" · ");
            const count =
              o.status === "draft" ? `Saved ${fmtDate(o.updatedAt)}`
              : o.status === "scheduled" ? "Scheduled"
              : closed ? `${placedFor(o.id)} placed`
              : `${n} applicant${n === 1 ? "" : "s"}`;
            return (
              <Row key={o.id} href={`/admin/opportunities/${o.id}`}>
                <RowText title={o.title} meta={meta} />
                <span className="text-[13px] text-muted">{count}</span>
                {o.pinned && <Badge tone="accent">Pinned</Badge>}
                {o.status === "draft" ? <Badge tone="warn">{OPPORTUNITY_STATUS_LABEL.draft}</Badge>
                  : o.status === "scheduled" ? <Badge tone="accent">Scheduled</Badge>
                  : closed ? <Badge tone="muted">Closed</Badge>
                  : closesSoon(o) ? <Badge tone="warn">Closes soon</Badge>
                  : <Badge tone="ok">Live</Badge>}
                {closed ? <ReopenButton id={o.id} /> : <span className="pill pill-ghost pill-xs">Edit</span>}
              </Row>
            );
          })} />
        </div>
      </Card>
    </div>
  );
}
