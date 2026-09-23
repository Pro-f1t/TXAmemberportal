"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/utils/api";
import { uploadViaApi } from "@/lib/firebase/upload";
import { TEAMS, teamShort, Team, MAX_RESUMES } from "@/lib/models/Member";
import { Badge, Chip, Eyebrow, Pill } from "@/components/ui";
import { fmtDate, fmtBytes } from "@/lib/utils/format";

type R = { id: string; fileName: string; url: string; size: number; uploadedAt: string; assignedTeams: Team[]; isDefault: boolean };

/**
 * "Resumes · N of 5". Upload PDFs, assign each to field teams (a team can only
 * be assigned to one resume — assigning moves it), set the default, delete.
 */
export default function ResumeManager({ uid, resumes, memberTeams }: { uid: string; resumes: R[]; memberTeams: Team[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const onUpload = (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { setError("Resumes must be PDFs."); return; }
    if (file.size > 4 * 1024 * 1024) { setError("Keep resumes under 4 MB."); return; }
    run(() => uploadViaApi("/api/profile/resumes/upload", file));
  };

  const assign = (id: string, team: Team) => run(() => api("/api/profile/resumes", "PATCH", { id, action: "toggleTeam", team }));
  const makeDefault = (id: string) => run(() => api("/api/profile/resumes", "PATCH", { id, action: "setDefault" }));
  const remove = (id: string) => {
    if (!confirm("Delete this resume?")) return;
    run(() => api("/api/profile/resumes", "DELETE", { id }));
  };

  const unassigned = memberTeams.filter((t) => !resumes.some((r) => r.assignedTeams.includes(t)));

  return (
    <div className="card min-w-0" style={{ padding: 28 }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Eyebrow>Resumes · {resumes.length} of {MAX_RESUMES}</Eyebrow>
          <p className="m-0 mt-2 text-[16px] text-muted">
            Assign a resume to each field team.
            {unassigned.length > 0 && resumes.length > 0 && <> {unassigned.length === 1 ? "One of your teams" : `${unassigned.length} of your teams`} still {unassigned.length === 1 ? "uses" : "use"} the default.</>}
          </p>
        </div>
        <Pill tone="blue" onClick={() => fileRef.current?.click()} disabled={busy || resumes.length >= MAX_RESUMES} title={resumes.length >= MAX_RESUMES ? "Delete one to upload another" : undefined}>
          {busy ? "Working…" : "Upload"}
        </Pill>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      <div className="mt-[22px] flex flex-col gap-3">
        {resumes.length === 0 && <p className="m-0 text-[15px] text-muted">No resumes yet. Upload a PDF — it becomes your default.</p>}
        {resumes.map((r) => {
          const isOpen = open === r.id;
          return (
            <div key={r.id} className="row-lg rounded-3xl" style={{ background: "var(--color-surface-2)", padding: "18px 22px" }}>
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div className="min-w-0">
                  <a href={r.url} target="_blank" rel="noreferrer" className="m-0 text-[16px] font-semibold text-white hover:text-accent">{r.fileName}</a>
                  <p className="m-0 mt-1 text-[12px] text-muted">{fmtDate(new Date(r.uploadedAt))} · {fmtBytes(r.size)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {r.assignedTeams.map((t) => <Chip key={t} on size="lg">{teamShort(t)}</Chip>)}
                  {r.isDefault && <Badge tone="muted">Default</Badge>}
                  <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} className="pill pill-ghost pill-xs" aria-expanded={isOpen}>{isOpen ? "Done" : "Manage"}</button>
                </div>
              </div>
              {isOpen && (
                <div className="mt-4 flex flex-col gap-3">
                  <p className="t-label">Assign to teams</p>
                  <div className="flex flex-wrap gap-2">
                    {TEAMS.map((t) => (
                      <Chip key={t} on={r.assignedTeams.includes(t)} onClick={() => assign(r.id, t)}>{teamShort(t)}</Chip>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {!r.isDefault && <Pill size="xs" onClick={() => makeDefault(r.id)} disabled={busy}>Make default</Pill>}
                    <Pill size="xs" href={r.url} target="_blank">Open PDF</Pill>
                    <button type="button" onClick={() => remove(r.id)} disabled={busy} className="pill pill-ghost pill-xs" style={{ color: "var(--color-danger)" }}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="m-0 mt-3 text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</p>}
    </div>
  );
}
