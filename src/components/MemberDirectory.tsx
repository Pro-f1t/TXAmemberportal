"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TEAMS, teamShort, Team } from "@/lib/models/Member";
import { Badge, Card, Chip, Empty } from "@/components/ui";
import { initials } from "@/lib/utils/format";

export type DirectoryRow = { uid: string; name: string; photoUrl: string; teams: Team[]; meta: string; role: string; title: string; group: string };

const PAGE = 24;

function groupRows(rows: DirectoryRow[]): { label: string; rows: DirectoryRow[] }[] {
  const out: { label: string; rows: DirectoryRow[] }[] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last.label === r.group) last.rows.push(r);
    else out.push({ label: r.group, rows: [r] });
  }
  return out;
}

/** Search + team chips over the member directory, as a card grid. */
export default function MemberDirectory({ rows }: { rows: DirectoryRow[] }) {
  const [q, setQ] = useState("");
  const [team, setTeam] = useState<Team | "">("");
  const [showAll, setShowAll] = useState(false);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => (!team || r.teams.includes(team)) && (!needle || r.name.toLowerCase().includes(needle) || r.meta.toLowerCase().includes(needle)));
  }, [rows, q, team]);
  const visible = showAll ? shown : shown.slice(0, PAGE);

  return (
    <>
      <div className="filter-bar">
        <input className="input input-pill" style={{ flex: "1 1 260px", width: "auto" }} placeholder="Search by name or major" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Chip on={team === ""} onClick={() => setTeam("")}>All teams</Chip>
          {TEAMS.map((t) => <Chip key={t} on={team === t} onClick={() => setTeam(t)}>{teamShort(t)}</Chip>)}
        </div>
      </div>

      {shown.length === 0 ? (
        <Card><Empty>No members match.</Empty></Card>
      ) : (
        // Grouped Directors → Exec → Field team leads → Members (rows arrive sorted).
        // Portrait tiles: cap the card, not the grid, so 2-up at half-width never
        // outgrows 5-up on desktop (see LEARNINGS 2026-08-09).
        <div className="flex flex-col gap-7">
          {groupRows(visible).map((g) => (
            <div key={g.label} className="flex flex-col gap-3">
              <p className="t-label m-0">{g.label} · {g.rows.length}</p>
              <div className="grid gap-4 justify-items-center" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
                {g.rows.map((r) => (
                  <Link key={r.uid} href={`/members/${r.uid}`} className="card flex w-full min-w-0 flex-col overflow-hidden transition-colors" style={{ maxWidth: 300, padding: 0 }}>
                    <span className="relative block w-full overflow-hidden" style={{ aspectRatio: "4 / 5", background: "var(--color-surface-2)" }}>
                      {r.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.photoUrl} alt={r.name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-top" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-[44px] font-semibold text-accent" style={{ letterSpacing: "-0.03em" }}>{initials(r.name)}</span>
                      )}
                      {r.role && <Badge tone={r.role === "Director" ? "solid" : "accent"} className="absolute left-3 top-3">{r.role}</Badge>}
                    </span>
                    <span className="flex min-w-0 flex-col gap-1.5" style={{ padding: "16px 18px 18px" }}>
                      <span className="truncate text-[17px] font-semibold" style={{ letterSpacing: "-0.02em" }}>{r.name}</span>
                      {r.title && <span className="truncate text-[13px] font-medium text-accent">{r.title}</span>}
                      <span className="truncate text-[13px] text-muted">{r.meta || "Major not set"}</span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {r.teams.length === 0 && <span className="text-[12px] text-muted">No team yet</span>}
                        {r.teams.map((t) => <span key={t} className="chip chip-static">{teamShort(t)}</span>)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {shown.length > PAGE && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="pill pill-ghost pill-xs self-start" aria-expanded={showAll}>
          {showAll ? "Show fewer" : `Show ${shown.length - PAGE} more members`}
        </button>
      )}
    </>
  );
}
