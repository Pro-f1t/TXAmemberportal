import { staffPage } from "@/lib/auth/page";
import { getAllEmployers, getAllOpportunities, getAllApplications } from "@/lib/firebase/portal";
import { isOpportunityLive, isPastDeadline } from "@/lib/models/Portal";
import { teamShort } from "@/lib/models/Member";
import { PageHeader, Pill, Card, Eyebrow, Badge, Row, RowText, Empty } from "@/components/ui";
import EmployerEditor from "@/components/EmployerEditor";
import { fmtDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function AdminEmployers({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const actor = await staffPage();
  const { id } = await searchParams;
  const [employers, opps, apps] = await Promise.all([getAllEmployers(), getAllOpportunities(), getAllApplications()]);
  const selected = id && id !== "new" ? employers.find((e) => e.id === id) ?? null : null;
  const editing = id === "new" ? null : selected ?? employers[0] ?? null;

  const summarise = (empId: string) => {
    const mine = opps.filter((o) => o.employerId === empId);
    const live = mine.filter((o) => isOpportunityLive(o) && !isPastDeadline(o) && o.status !== "closed");
    const draft = mine.filter((o) => o.status === "draft");
    const scheduled = mine.filter((o) => o.status === "scheduled" && !isOpportunityLive(o));
    const lastClosed = mine.filter((o) => o.status === "closed" || isPastDeadline(o)).sort((a, b) => (b.closesAt?.getTime() ?? 0) - (a.closesAt?.getTime() ?? 0))[0];
    return { live, draft, scheduled, lastClosed, all: mine };
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow={`Exec console · Employers · ${employers.length}`} title="Employers" actions={<Pill href="/admin/employers?id=new" tone="blue">Add employer</Pill>} />
      <div className="grid items-start gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <Card>
          <Eyebrow>Partners</Eyebrow>
          <div className="mt-[18px] flex flex-col gap-2.5">
            {employers.length === 0 && <Empty>No employers yet.</Empty>}
            {employers.map((e) => {
              const s = summarise(e.id);
              const posting =
                s.live.length ? `${s.live.length} live posting${s.live.length === 1 ? "" : "s"}`
                : s.scheduled.length ? `posting scheduled ${fmtDate(s.scheduled[0].publishAt)}`
                : s.draft.length ? `${s.draft.length} draft${s.draft.length === 1 ? "" : "s"}`
                : s.lastClosed ? `last posting closed ${fmtDate(s.lastClosed.closesAt)}` : "no postings yet";
              const badge =
                e.status === "inactive" ? <Badge tone="muted">Inactive</Badge>
                : s.live.length ? <Badge tone="ok">Active</Badge>
                : s.scheduled.length ? <Badge tone="accent">Scheduled</Badge>
                : s.draft.length ? <Badge tone="warn">Draft posting</Badge>
                : <Badge tone="muted">Inactive</Badge>;
              return (
                <Row key={e.id} href={`/admin/employers?id=${e.id}`} style={editing?.id === e.id ? { outline: "1px solid rgba(96,165,250,0.5)" } : undefined}>
                  <RowText title={e.name} meta={[e.teams.map(teamShort).join(", "), posting, e.contact ? `contact: ${e.contact}` : ""].filter(Boolean).join(" · ")} />
                  {badge}
                  <span className="pill pill-ghost pill-xs">Edit</span>
                </Row>
              );
            })}
          </div>
        </Card>
        <EmployerEditor
          key={id === "new" ? "new" : editing?.id ?? "none"}
          uid={actor.uid}
          employer={editing ? { id: editing.id, name: editing.name, contact: editing.contact, email: editing.email, location: editing.location, website: editing.website, teams: editing.teams, logoUrl: editing.logoUrl, status: editing.status } : null}
          postings={
            editing
              ? summarise(editing.id).all.map((o) => {
                  const n = apps.filter((a) => a.opportunityId === o.id).length;
                  const placed = apps.filter((a) => a.opportunityId === o.id && a.status === "placed").length;
                  const closed = o.status === "closed" || isPastDeadline(o);
                  return { id: o.id, title: o.title, meta: closed ? `Closed · ${placed} placed` : o.status === "draft" ? "Draft" : `${o.status === "scheduled" ? "Scheduled" : "Live"} · ${o.closesAt ? `closes ${fmtDate(o.closesAt)}` : "rolling"} · ${n} applicant${n === 1 ? "" : "s"}`, closed };
                })
              : []
          }
        />
      </div>
    </div>
  );
}
