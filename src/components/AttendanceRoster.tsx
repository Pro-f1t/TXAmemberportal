"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/utils/api";
import { Badge, Chip } from "@/components/ui";

type RowT = { uid: string; name: string; meta: string; rsvp: boolean; attended: boolean; excused: boolean };

/** Roster with Attended / Excused toggles per member. Optimistic, reverts on error. */
export default function AttendanceRoster({ eventId, rows: initial }: { eventId: string; rows: RowT[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...rows]
      .filter((r) => !needle || r.name.toLowerCase().includes(needle) || r.meta.toLowerCase().includes(needle))
      .sort((a, b) => Number(b.attended) - Number(a.attended) || Number(b.rsvp) - Number(a.rsvp) || a.name.localeCompare(b.name));
  }, [rows, q]);

  const mark = async (uid: string, action: "attended" | "unattended" | "excused" | "unexcused") => {
    const prev = rows;
    setRows((rs) => rs.map((r) => (r.uid !== uid ? r : {
      ...r,
      attended: action === "attended" ? true : action === "unattended" || action === "excused" ? false : r.attended,
      excused: action === "excused" ? true : action === "unexcused" || action === "attended" ? false : r.excused,
    })));
    setBusy(uid);
    try {
      await api(`/api/admin/events/${eventId}/attendance`, "POST", { uid, action });
      router.refresh();
    } catch {
      setRows(prev);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <input className="input input-pill mt-4" placeholder="Search members" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 360 }} />
      <div className="mt-4 flex flex-col gap-2.5">
        {shown.map((r) => (
          <div key={r.uid} className="row row-wrap">
            <div className="min-w-0" style={{ flex: "1 1 220px" }}>
              <p className="m-0 text-[15px] font-semibold"><Link href={`/admin/members/${r.uid}`} className="text-white hover:text-accent">{r.name}</Link></p>
              <p className="m-0 mt-1 text-[12px] text-muted">{[r.meta, r.rsvp ? "RSVP'd" : ""].filter(Boolean).join(" · ")}</p>
            </div>
            {r.attended ? <Badge tone="ok">Attended</Badge> : r.excused ? <Badge tone="muted">Excused</Badge> : r.rsvp ? <Badge tone="accent">Going</Badge> : <span className="badge" style={{ visibility: "hidden" }}>—</span>}
            <div className="flex gap-1.5">
              <Chip on={r.attended} onClick={() => mark(r.uid, r.attended ? "unattended" : "attended")}>{r.attended ? "Attended ✓" : "Mark attended"}</Chip>
              <Chip on={r.excused} onClick={() => mark(r.uid, r.excused ? "unexcused" : "excused")}>{r.excused ? "Excused ✓" : "Excuse"}</Chip>
            </div>
            {busy === r.uid && <span className="text-[12px] text-muted">Saving…</span>}
          </div>
        ))}
        {shown.length === 0 && <p className="m-0 text-[15px] text-muted">No members match.</p>}
      </div>
    </>
  );
}
