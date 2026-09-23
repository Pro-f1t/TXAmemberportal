"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TEAMS, teamShort, Team } from "@/lib/models/Member";
import { Badge, Card, Chip, Empty } from "@/components/ui";
import { initials } from "@/lib/utils/format";

export type DirectoryRow = { uid: string; name: string; photoUrl: string; teams: Team[]; meta: string; role: string };

const PAGE = 24;

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
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {visible.map((r) => (
            <Link key={r.uid} href={`/members/${r.uid}`} className="card flex min-w-0 items-center gap-4 transition-colors" style={{ padding: 20 }}>
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-[18px] font-semibold text-accent" style={{ background: "var(--color-surface-2)" }}>
                {r.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photoUrl} alt={r.name} className="h-full w-full object-cover" />
                ) : initials(r.name)}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[16px] font-semibold">{r.name}</span>
                  {r.role && <Badge tone="accent">{r.role}</Badge>}
                </span>
                <span className="mt-1 block truncate text-[12px] text-muted">{r.meta || "—"}</span>
                <span className="mt-1 block truncate text-[12px] text-muted">{r.teams.map(teamShort).join(", ") || "No team yet"}</span>
              </span>
            </Link>
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
