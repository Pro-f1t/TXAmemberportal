"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/utils/api";
import { uploadViaApi, shrinkImage } from "@/lib/firebase/upload";
import { TEAMS, teamShort, Team } from "@/lib/models/Member";
import { EmployerStatus, POSTING_IMAGE_ASPECT, POSTING_IMAGE_SIZE } from "@/lib/models/Portal";
import { Badge, Chip, Eyebrow, Field, Hairline, Pill, Row, RowText } from "@/components/ui";

export type EmployerForm = { id: string; name: string; contact: string; email: string; location: string; website: string; teams: Team[]; logoUrl: string; status: EmployerStatus };
const BLANK: EmployerForm = { id: "", name: "", contact: "", email: "", location: "", website: "", teams: [], logoUrl: "", status: "active" };

export default function EmployerEditor({ uid, employer, postings }: { uid: string; employer: EmployerForm | null; postings: { id: string; title: string; meta: string; closed: boolean }[] }) {
  const router = useRouter();
  const [form, setForm] = useState<EmployerForm>(employer ?? BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNew = !form.id;
  const set = <K extends keyof EmployerForm>(k: K, v: EmployerForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    if (!form.name.trim()) { setError("Give the employer a name."); setBusy(false); return; }
    try {
      const res = await api<{ id: string }>("/api/admin/employers", isNew ? "POST" : "PATCH", form);
      if (isNew) router.push(`/admin/employers?id=${res.id}`);
      else { setSaved(true); router.refresh(); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const onLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) { setError("Logo must be a PNG, JPEG, or SVG."); return; }
    setBusy(true);
    setError(null);
    try {
      // SVGs pass through untouched; raster logos are downscaled like everything else.
      const upload = file.type === "image/svg+xml" ? file : await shrinkImage(file, 1600);
      set("logoUrl", (await uploadViaApi("/api/admin/uploads/image", upload)).url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card min-w-0" style={{ padding: 28 }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>{isNew ? "New employer" : `Editing · ${employer?.name}`}</Eyebrow>
        <Badge tone={form.status === "active" ? "ok" : "muted"}>{form.status === "active" ? "Active" : "Inactive"}</Badge>
      </div>
      <div className="mt-5 flex flex-wrap items-start gap-5">
        <div className="flex shrink-0 flex-col gap-2" style={{ width: 300, maxWidth: "100%" }}>
          <button type="button" onClick={() => fileRef.current?.click()} className="relative block w-full overflow-hidden rounded-[20px]" style={{ aspectRatio: POSTING_IMAGE_ASPECT, background: "var(--color-surface-2)" }} title={`Upload a ${POSTING_IMAGE_SIZE} image`} disabled={busy}>
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoUrl} alt={form.name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center px-4 text-center text-[12px] text-muted">Upload default image</span>
            )}
          </button>
          <span className="text-[12px] text-muted">Default posting image · {POSTING_IMAGE_SIZE}. Used on this employer&apos;s postings unless a posting has its own.</span>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))", flex: "1 1 260px" }}>
          <Field label="Employer name" span><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Contact"><input className="input" value={form.contact} onChange={(e) => set("contact", e.target.value)} /></Field>
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Location"><input className="input" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Austin, TX" /></Field>
          <Field label="Website"><input className="input" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="example.com" /></Field>
        </div>
      </div>
      <div className="mt-3.5 flex flex-col gap-2">
        <span className="t-label">Field teams</span>
        <div className="flex flex-wrap gap-2">{TEAMS.map((t) => <Chip key={t} on={form.teams.includes(t)} onClick={() => set("teams", form.teams.includes(t) ? form.teams.filter((x) => x !== t) : [...form.teams, t])}>{teamShort(t)}</Chip>)}</div>
      </div>
      <div className="mt-3.5 flex flex-col gap-2">
        <span className="t-label">Status</span>
        <div className="flex flex-wrap gap-2">
          <Chip on={form.status === "active"} onClick={() => set("status", "active")}>Active</Chip>
          <Chip on={form.status === "inactive"} onClick={() => set("status", "inactive")}>Inactive</Chip>
        </div>
      </div>

      {!isNew && (
        <>
          <Hairline className="my-[22px]" />
          <Eyebrow>Postings with this employer</Eyebrow>
          <div className="mt-3.5 flex flex-col gap-2.5">
            {postings.length === 0 && <p className="m-0 text-[15px] text-muted">No postings yet.</p>}
            {postings.map((p) => (
              <Row key={p.id} href={`/admin/opportunities/${p.id}`}>
                <RowText title={p.title} meta={p.meta} />
                {p.closed ? <Badge tone="muted">Closed</Badge> : <span className="pill pill-ghost pill-xs">Open</span>}
              </Row>
            ))}
          </div>
        </>
      )}

      <div className="mt-[22px] flex flex-wrap items-center gap-2.5">
        <Pill tone="blue" onClick={save} disabled={busy}>{busy ? "Saving…" : isNew ? "Create employer" : "Save changes"}</Pill>
        {!isNew && <Pill href={`/admin/opportunities/new?employer=${form.id}`}>New posting for this employer</Pill>}
        {saved && <span className="text-[13px] text-ok">Saved</span>}
      </div>
      {error && <p className="m-0 mt-3 text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</p>}
    </div>
  );
}
