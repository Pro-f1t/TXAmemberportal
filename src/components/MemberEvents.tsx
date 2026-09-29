"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/utils/api";
import { Badge, Card, Eyebrow, Pill } from "@/components/ui";
import ShowMore from "@/components/ShowMore";
import type { AttendanceState } from "@/lib/portal/memberData";

type RowT = { id: string; title: string; meta: string; state: AttendanceState; counts: boolean };

/** "Events · 2 attended" on member detail, with Mark attended / Excuse. */
export default function MemberEvents({ uid, attended, rows }: { uid: string; attended: number; rows: RowT[] }) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const mark = async (eventId: string, action: "attended" | "excused" | "unattended") => {
    setBusy(eventId);
    try {
      await api(`/api/admin/events/${eventId}/attendance`, "POST", { uid, action });
      setPicking(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const markable = rows.filter((r) => r.state !== "attended");

  return (
    <Card className="flex-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>Events · {attended} attended</Eyebrow>
        <button type="button" className="pill pill-ghost pill-xs" onClick={() => setPicking((v) => !v)} aria-expanded={picking}>{picking ? "Cancel" : "Mark attended"}</button>
      </div>
      {picking && (
        <div className="mt-3 flex flex-wrap gap-2">
          {markable.length === 0 && <span className="text-[13px] text-muted">Every event is already marked.</span>}
          {markable.map((r) => (
            <button key={r.id} type="button" className="chip" disabled={busy === r.id} onClick={() => mark(r.id, "attended")}>{r.title}</button>
          ))}
        </div>
      )}
      {rows.length === 0 && <p className="m-0 mt-[18px] text-[15px] text-muted">No events this season.</p>}
      <ShowMore initial={6} label="more events" className="mt-[18px] flex flex-col gap-2.5" items={rows.map((r) => (
          <div key={r.id} className="row row-wrap">
            <div className="min-w-0" style={{ flex: "1 1 220px" }}>
              <p className="m-0 text-[15px] font-semibold">{r.title}</p>
              <p className="m-0 mt-1 text-[12px] text-muted">{r.meta}{!r.counts ? " · Doesn't count" : ""}</p>
            </div>
            {r.state === "attended" ? <Badge tone="ok">Attended</Badge> : r.state === "excused" ? <Badge tone="muted">Excused</Badge> : r.state === "missed" ? <Badge tone="danger">Missed</Badge> : <Badge tone="muted">Upcoming</Badge>}
            {r.state === "missed" && <button type="button" className="pill pill-ghost pill-xs" disabled={busy === r.id} onClick={() => mark(r.id, "excused")}>Excuse</button>}
            {r.state === "attended" && <button type="button" className="pill pill-ghost pill-xs" disabled={busy === r.id} onClick={() => mark(r.id, "unattended")} title="Undo">Undo</button>}
          </div>
        ))} />
    </Card>
  );
}
