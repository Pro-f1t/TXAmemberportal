"use client";

import { useMemo, useState } from "react";
import { AREAS } from "@/lib/portal/activity";
import { Badge, Card, Chip, Empty } from "@/components/ui";

type Row = { id: string; at: string; actorUid: string; actorName: string; area: string; verb: string; detail: string };

const PAGE = 60;
const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" });

/** Filterable console audit trail, grouped by day (Central). */
export default function ActivityLog({ rows }: { rows: Row[] }) {
  const [actor, setActor] = useState("");
  const [area, setArea] = useState("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const actors = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) if (r.actorUid && !seen.has(r.actorUid)) seen.set(r.actorUid, r.actorName);
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => (!actor || r.actorUid === actor) && (!area || r.area === area) && (!needle || `${r.actorName} ${r.verb} ${r.detail}`.toLowerCase().includes(needle)));
  }, [rows, actor, area, q]);

  const days = useMemo(() => {
    const out: { day: string; rows: Row[] }[] = [];
    for (const r of shown.slice(0, limit)) {
      const day = dayFmt.format(new Date(r.at));
      const last = out[out.length - 1];
      if (last && last.day === day) last.rows.push(r);
      else out.push({ day, rows: [r] });
    }
    return out;
  }, [shown, limit]);

  return (
    <>
      <div className="filter-bar">
        <input className="input input-pill" style={{ flex: "1 1 240px", width: "auto" }} placeholder="Search names, postings, events" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" style={{ flex: "0 1 220px" }} value={actor} onChange={(e) => setActor(e.target.value)} aria-label="Filter by person">
          <option value="">Everyone</option>
          {actors.map(([uid, name]) => <option key={uid} value={uid}>{name}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip on={area === ""} onClick={() => setArea("")}>All areas</Chip>
        {AREAS.map((a) => <Chip key={a} on={area === a} onClick={() => setArea(a)}>{a}</Chip>)}
      </div>

      <Card>
        {shown.length === 0 ? (
          <Empty>No console activity{actor || area || q ? " matches" : " yet"}.</Empty>
        ) : (
          <div className="flex flex-col gap-6">
            {days.map((d) => (
              <div key={d.day} className="flex flex-col gap-2">
                <p className="t-label m-0">{d.day}</p>
                {d.rows.map((r) => (
                  <div key={r.id} className="row flex flex-wrap items-start gap-x-4 gap-y-1" style={{ padding: "12px 16px" }}>
                    <span className="shrink-0 text-[12px] text-muted tabular-nums" style={{ width: 64, paddingTop: 2 }}>{timeFmt.format(new Date(r.at))}</span>
                    <div className="min-w-0 flex-1" style={{ flexBasis: 240 }}>
                      <p className="m-0 text-[14px]"><span className="font-semibold">{r.actorName}</span> <span className="text-muted">{r.verb}</span></p>
                      {r.detail && <p className="m-0 mt-0.5 text-[13px] text-muted" style={{ overflowWrap: "anywhere" }}>{r.detail}</p>}
                    </div>
                    <Badge tone="muted">{r.area}</Badge>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        {shown.length > limit && (
          <button type="button" className="pill pill-ghost pill-xs mt-5" onClick={() => setLimit((l) => l + PAGE)}>Show {Math.min(PAGE, shown.length - limit)} more</button>
        )}
      </Card>
    </>
  );
}
