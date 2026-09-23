"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ApplicationStatus } from "@/lib/models/Portal";
import { Card, Chip, Empty, Eyebrow } from "@/components/ui";
import ApplicationStatusRow from "@/components/ApplicationStatusRow";

export type BoardRow = {
  application: { id: string; status: ApplicationStatus; nextStep: string; nextStepAt: string | null; joinLink: string; submittedAt: string; resumeFileName: string; answers?: { id: string; label: string; value: string }[] };
  title: string; subtitle: string; memberHref?: string; resumeUrl?: string;
  opportunityId: string; opportunityTitle: string; employerName: string; status: ApplicationStatus; submittedAt: number;
};

const FILTERS: { key: string; label: string; statuses: ApplicationStatus[] }[] = [
  { key: "open", label: "Needs a decision", statuses: ["submitted", "under_review", "interview", "offer"] },
  { key: "new", label: "New", statuses: ["submitted"] },
  { key: "review", label: "Under review", statuses: ["under_review"] },
  { key: "interview", label: "Interview", statuses: ["interview"] },
  { key: "offer", label: "Offer out", statuses: ["offer"] },
  { key: "placed", label: "Placed", statuses: ["placed"] },
  { key: "closed", label: "Declined / complete", statuses: ["declined", "complete"] },
  { key: "all", label: "All", statuses: [] },
];

/** Filterable board of every application, grouped by posting. */
export default function ApplicationsBoard({ rows, postings }: { rows: BoardRow[]; postings: { id: string; title: string }[] }) {
  const [filter, setFilter] = useState("open");
  const [posting, setPosting] = useState("");
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => (f.statuses.length === 0 || f.statuses.includes(r.status)) && (!posting || r.opportunityId === posting) && (!needle || r.title.toLowerCase().includes(needle) || r.opportunityTitle.toLowerCase().includes(needle) || r.employerName.toLowerCase().includes(needle)))
      .sort((a, b) => b.submittedAt - a.submittedAt);
  }, [rows, filter, posting, q]);

  // Group by posting so an exec works one pipeline at a time.
  const groups = useMemo(() => {
    const map = new Map<string, BoardRow[]>();
    for (const r of shown) map.set(r.opportunityId, [...(map.get(r.opportunityId) ?? []), r]);
    return [...map.entries()];
  }, [shown]);

  return (
    <>
      <div className="filter-bar">
        <input className="input input-pill" style={{ flex: "1 1 240px", width: "auto" }} placeholder="Search applicant, posting, or employer" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" style={{ width: 260, borderRadius: 999, padding: "12px 40px 12px 20px", background: "var(--color-surface)" }} value={posting} onChange={(e) => setPosting(e.target.value)}>
          <option value="">All postings</option>
          {postings.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n = f.statuses.length ? rows.filter((r) => f.statuses.includes(r.status)).length : rows.length;
          return <Chip key={f.key} on={filter === f.key} onClick={() => setFilter(f.key)}>{f.label} · {n}</Chip>;
        })}
      </div>

      {groups.length === 0 && <Card><Empty>No applications match.</Empty></Card>}
      {groups.map(([oppId, list]) => (
        <Card key={oppId}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Eyebrow>{list[0].employerName || "No employer"}</Eyebrow>
              <p className="m-0 mt-1.5 text-[20px] font-bold leading-[1.2]" style={{ letterSpacing: "-0.02em" }}>
                <Link href={`/admin/opportunities/${oppId}`} className="text-white hover:text-accent">{list[0].opportunityTitle}</Link>
              </p>
            </div>
            <Link href={`/admin/opportunities/${oppId}/applicants`} className="text-[13px] font-semibold text-accent hover:text-white">{list.length} {list.length === 1 ? "application" : "applications"} · open pipeline</Link>
          </div>
          <div className="mt-[18px] flex flex-col gap-2.5">
            {list.map((r) => (
              <ApplicationStatusRow key={r.application.id} application={r.application} title={r.title} subtitle={r.subtitle} memberHref={r.memberHref} resumeUrl={r.resumeUrl} />
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}
