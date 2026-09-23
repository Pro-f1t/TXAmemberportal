import { memberPage } from "@/lib/auth/page";
import { visibleAnnouncements, portalConfig } from "@/lib/portal/memberData";
import { ANNOUNCEMENT_LABEL_TEXT } from "@/lib/models/Portal";
import { PageHeader, Pill, Card, Eyebrow, Badge, Empty } from "@/components/ui";
import ShowMore from "@/components/ShowMore";
import { groupByMonth } from "@/lib/utils/group";
import { fmtDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const LABEL_TONE = { pinned: "accent", action: "warn", update: "muted" } as const;

/** Every live announcement the member can see: pinned first, then by month. */
export default async function AnnouncementsPage() {
  const member = await memberPage("/announcements");
  const [config, anns] = await Promise.all([portalConfig(), visibleAnnouncements(member)]);
  const pinned = anns.filter((a) => a.label === "pinned");
  const rest = anns.filter((a) => a.label !== "pinned").sort((a, b) => (b.publishAt ?? b.createdAt).getTime() - (a.publishAt ?? a.createdAt).getTime());
  const months = groupByMonth(rest, (a) => a.publishAt ?? a.createdAt);

  const row = (a: (typeof anns)[number]) => (
    <div key={a.id} className="rounded-3xl" style={{ background: "var(--color-surface-2)", padding: "22px 24px" }}>
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={LABEL_TONE[a.label]}>{ANNOUNCEMENT_LABEL_TEXT[a.label]}</Badge>
        <span className="text-[12px] text-muted">{fmtDate(a.publishAt ?? a.createdAt)} · {a.authorName}</span>
      </div>
      <p className="m-0 mt-3 text-[20px] font-semibold" style={{ letterSpacing: "-0.02em" }}>{a.title}</p>
      <p className="m-0 mt-2 text-[16px] leading-[1.55] text-muted">{a.body}</p>
    </div>
  );

  return (
    <section className="shell pb-16" style={{ paddingTop: 90 }}>
      <div className="flex flex-col gap-5">
        <PageHeader eyebrow={`${config.season} · ${anns.length} ${anns.length === 1 ? "announcement" : "announcements"}`} title="Announcements" actions={<Pill href="/">Back to home</Pill>} />
        {anns.length === 0 && <Card><Empty>Nothing from exec yet.</Empty></Card>}
        {pinned.length > 0 && (
          <Card pad={32}>
            <Eyebrow>Pinned</Eyebrow>
            <div className="mt-5 flex flex-col gap-3">{pinned.map(row)}</div>
          </Card>
        )}
        {months.map((m) => (
          <Card key={m.key} pad={32} className="flex flex-col">
            <Eyebrow>{m.label} · {m.items.length}</Eyebrow>
            <div className="mt-5 flex flex-col">
              <ShowMore items={m.items.map(row)} initial={6} label="older" className="flex flex-col gap-3" />
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
