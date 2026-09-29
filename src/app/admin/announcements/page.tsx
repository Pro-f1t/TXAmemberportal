import { getAllAnnouncements } from "@/lib/firebase/portal";
import { isAnnouncementLive, ANNOUNCEMENT_LABEL_TEXT } from "@/lib/models/Portal";
import { teamShort } from "@/lib/models/Member";
import { PageHeader, Pill, Card, Eyebrow, Badge, Row, RowText, Empty } from "@/components/ui";
import AnnouncementEditor from "@/components/AnnouncementEditor";
import { fmtDate } from "@/lib/utils/format";
import ShowMore from "@/components/ShowMore";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncements({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const anns = await getAllAnnouncements();
  const selected = id && id !== "new" ? anns.find((a) => a.id === id) ?? null : null;
  const editing = id === "new" ? null : selected ?? anns[0] ?? null;
  // Working set first: pinned, scheduled, drafts; then everything live by date.
  const rank = (a: (typeof anns)[number]) => (a.label === "pinned" && a.status === "live" ? 0 : a.status === "scheduled" ? 1 : a.status === "draft" ? 2 : 3);
  const ordered = [...anns].sort((a, b) => rank(a) - rank(b));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Exec console · Announcements" title="Announcements" actions={<Pill href="/admin/announcements?id=new" tone="blue">New announcement</Pill>} />
      <div className="grid items-start gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}>
        <Card>
          <Eyebrow>Posted</Eyebrow>
          <div className="mt-[18px] flex flex-col">
            {anns.length === 0 && <Empty>Nothing posted yet.</Empty>}
            <ShowMore initial={8} label="older" className="flex flex-col gap-2.5" items={ordered.map((a) => {
              const live = isAnnouncementLive(a);
              const audience = a.audienceTeams.length ? a.audienceTeams.map(teamShort).join(", ") : "All members";
              const when = a.status === "scheduled" && !live ? `Scheduled ${fmtDate(a.publishAt)}` : fmtDate(a.publishAt ?? a.createdAt);
              const expired = a.expiresAt && a.expiresAt.getTime() < Date.now();
              return (
                <Row key={a.id} href={`/admin/announcements?id=${a.id}`} style={editing?.id === a.id ? { outline: "1px solid rgba(96,165,250,0.5)" } : undefined}>
                  <RowText title={a.title} meta={[when, a.authorName, audience, a.label === "action" ? ANNOUNCEMENT_LABEL_TEXT.action : ""].filter(Boolean).join(" · ")} />
                  {a.status === "draft" ? <Badge tone="muted">Draft</Badge> : expired ? <Badge tone="muted">Expired</Badge> : a.status === "scheduled" && !live ? <Badge tone="warn">Scheduled</Badge> : a.label === "pinned" ? <Badge tone="accent">Pinned</Badge> : <Badge tone="ok">Live</Badge>}
                  <span className="pill pill-ghost pill-xs">Edit</span>
                </Row>
              );
            })} />
          </div>
        </Card>
        <AnnouncementEditor
          key={id === "new" ? "new" : editing?.id ?? "none"}
          announcement={
            editing
              ? { id: editing.id, title: editing.title, body: editing.body, label: editing.label, audienceTeams: editing.audienceTeams, status: editing.status, publishAt: editing.publishAt?.toISOString() ?? null, expiresAt: editing.expiresAt?.toISOString() ?? null, emailMembers: editing.emailMembers }
              : null
          }
        />
      </div>
    </div>
  );
}
