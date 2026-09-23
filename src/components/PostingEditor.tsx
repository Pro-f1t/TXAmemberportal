"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/utils/api";
import { uploadFile } from "@/lib/firebase/upload";
import { TEAMS, teamShort, Team } from "@/lib/models/Member";
import { OpportunityStatus, OPPORTUNITY_STATUS_LABEL, PostingQuestion, MAX_QUESTIONS } from "@/lib/models/Portal";
import { Badge, Chip, Hairline, Pill, ArtImage } from "@/components/ui";
import { fmtDate, relativeTime } from "@/lib/utils/format";
import DatePicker from "@/components/DatePicker";

export type PostingForm = {
  id: string; title: string; employerId: string; teams: Team[]; audienceTeams: Team[]; commitment: string;
  closesAt: string | null; status: OpportunityStatus; publishAt: string | null; previewImageUrl: string;
  summary: string; description: string; requiresTeamResume: boolean; pinned: boolean; questions: PostingQuestion[];
  publishedAt: string | null; updatedAt: string; updatedByName: string;
};

const BLANK: PostingForm = {
  id: "", title: "", employerId: "", teams: [], audienceTeams: [], commitment: "", closesAt: null, status: "draft", publishAt: null,
  previewImageUrl: "", summary: "", description: "", requiresTeamResume: true, pinned: false, questions: [], publishedAt: null, updatedAt: "", updatedByName: "",
};

const STATUS_TONE: Record<OpportunityStatus, "ok" | "warn" | "accent" | "muted"> = { live: "ok", draft: "warn", scheduled: "accent", closed: "muted" };

/** The Notion-style posting document. Everything is editable in place. */
export default function PostingEditor({
  uid, posting, employers, applicantCount, defaultEmployerId,
}: {
  uid: string; posting: PostingForm | null; employers: { id: string; name: string; teams: Team[] }[]; applicantCount: number; defaultEmployerId: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<PostingForm>(posting ?? { ...BLANK, employerId: defaultEmployerId });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNew = !form.id;

  const set = <K extends keyof PostingForm>(k: K, v: PostingForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k: "teams" | "audienceTeams", t: Team) => set(k, form[k].includes(t) ? form[k].filter((x) => x !== t) : [...form[k], t]);

  const save = async (overrides: Partial<PostingForm> = {}) => {
    setBusy(true);
    setError(null);
    setSaved(null);
    const payload = { ...form, ...overrides };
    if (!payload.title.trim()) { setError("Give the posting a title."); setBusy(false); return; }
    try {
      const res = await api<{ id: string }>("/api/admin/opportunities", isNew ? "POST" : "PATCH", payload);
      if (isNew) {
        router.push(`/admin/opportunities/${res.id}`);
      } else {
        setForm((f) => ({ ...f, ...overrides }));
        setSaved(payload.status === "live" && form.status !== "live" ? "Published" : "Saved");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const onImage = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { setError("Preview must be a PNG or JPEG."); return; }
    setBusy(true);
    setError(null);
    try {
      const url = await uploadFile("images", uid, file);
      set("previewImageUrl", url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const employer = employers.find((e) => e.id === form.employerId);
  const headline =
    isNew ? "New posting — not saved yet"
    : form.status === "live" ? `Published ${fmtDate(form.publishedAt ? new Date(form.publishedAt) : null) || "—"} · ${applicantCount} applicant${applicantCount === 1 ? "" : "s"}${form.closesAt ? ` · closes ${fmtDate(new Date(form.closesAt))}` : " · rolling"}`
    : form.status === "scheduled" ? `Posts ${fmtDate(form.publishAt ? new Date(form.publishAt) : null) || "(set a publish date)"}`
    : form.status === "closed" ? `Closed · ${applicantCount} applicant${applicantCount === 1 ? "" : "s"}`
    : "Draft · not visible to members";

  return (
    <div className="card min-w-0" style={{ padding: "36px clamp(24px, 3vw, 40px)" }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge tone={STATUS_TONE[form.status]}>{form.status === "draft" ? "Draft" : OPPORTUNITY_STATUS_LABEL[form.status]}</Badge>
          <span className="text-[13px] text-muted">{headline}</span>
        </div>
        {!isNew && form.updatedAt && <span className="text-[13px] text-muted">Edited {relativeTime(new Date(form.updatedAt))} by {form.updatedByName || "exec"}</span>}
      </div>

      <input
        value={form.title}
        onChange={(e) => set("title", e.target.value)}
        placeholder="Posting title"
        className="mt-5 w-full bg-transparent font-semibold text-white outline-none placeholder:text-white/30"
        style={{ fontSize: "clamp(26px, 3vw, 36px)", lineHeight: 1.29, letterSpacing: "-0.02em", border: "none", padding: 0 }}
      />

      <div className="mt-6 flex flex-col gap-0.5">
        <Prop label="Status">
          <span className="flex flex-wrap gap-2">
            {(["live", "draft", "scheduled", "closed"] as OpportunityStatus[]).map((s) => (
              <Chip key={s} on={form.status === s} onClick={() => set("status", s)}>{OPPORTUNITY_STATUS_LABEL[s]}</Chip>
            ))}
          </span>
        </Prop>
        {form.status === "scheduled" && (
          <Prop label="Publish on">
            <DatePicker withTime defaultHour={9} style={{ width: 260 }} value={form.publishAt ? new Date(form.publishAt) : null} onChange={(d) => set("publishAt", d ? d.toISOString() : null)} placeholder="Pick a date and time" />
          </Prop>
        )}
        <Prop label="Applications close">
          <DatePicker defaultHour={23} style={{ width: 220 }} value={form.closesAt ? new Date(form.closesAt) : null} onChange={(d) => set("closesAt", d ? d.toISOString() : null)} placeholder="Rolling" />
          <span className="text-[12px] text-muted">{form.closesAt ? "11:59 PM Central" : "Rolling — no deadline"}</span>
        </Prop>
        <Prop label="Employer">
          <select className="select" style={{ width: 260, borderRadius: 12, padding: "8px 14px" }} value={form.employerId} onChange={(e) => { const emp = employers.find((x) => x.id === e.target.value); set("employerId", e.target.value); if (emp && form.teams.length === 0) set("teams", emp.teams); }}>
            <option value="">Choose an employer…</option>
            {employers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <Link href="/admin/employers?id=new" className="text-[13px] font-semibold text-accent">Add employer</Link>
        </Prop>
        <Prop label="Field teams">
          <span className="flex flex-wrap gap-2">{TEAMS.map((t) => <Chip key={t} on={form.teams.includes(t)} onClick={() => toggle("teams", t)}>{teamShort(t)}</Chip>)}</span>
        </Prop>
        <Prop label="Visible to">
          <span className="flex flex-wrap gap-2">
            <Chip on={form.audienceTeams.length === 0} onClick={() => set("audienceTeams", [])}>All members</Chip>
            {TEAMS.map((t) => <Chip key={t} on={form.audienceTeams.includes(t)} onClick={() => toggle("audienceTeams", t)}>{teamShort(t)}</Chip>)}
          </span>
        </Prop>
        <Prop label="Commitment">
          <input className="input" style={{ width: 260, borderRadius: 12, padding: "8px 14px" }} placeholder="10 hrs/wk · Fall 2026" value={form.commitment} onChange={(e) => set("commitment", e.target.value)} />
        </Prop>
        <Prop label="Preview image" align="start">
          <button type="button" onClick={() => fileRef.current?.click()} className="relative block overflow-hidden rounded-2xl" style={{ width: 220, height: 120 }} title="Upload the employer logo or a project photo" disabled={busy}>
            {form.previewImageUrl ? (
              <ArtImage src={form.previewImageUrl} alt="Preview" className="h-full w-full" />
            ) : (
              <span className="flex h-full w-full items-center justify-center px-4 text-center text-[12px] text-muted" style={{ background: "var(--color-surface-2)" }}>Drop the employer logo or a project photo</span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onImage(e.target.files?.[0])} />
          {form.previewImageUrl && <button type="button" onClick={() => set("previewImageUrl", "")} className="text-[13px] text-muted hover:text-white">Remove</button>}
        </Prop>
        <Prop label="Placement">
          <Chip on={form.pinned} onClick={() => set("pinned", !form.pinned)}>{form.pinned ? "Pinned to top" : "Pin to top"}</Chip>
          <span className="text-[12px] text-muted">Pinned postings lead the members&apos; Opportunities grid.</span>
        </Prop>
        <Prop label="Resume rule">
          <Chip on={form.requiresTeamResume} onClick={() => set("requiresTeamResume", !form.requiresTeamResume)}>{form.requiresTeamResume ? "Team resume preselected" : "Default resume preselected"}</Chip>
        </Prop>
      </div>

      <Hairline className="my-6" />

      <p className="t-eyebrow">Summary</p>
      <textarea className="textarea mt-3" style={{ fontSize: 18, lineHeight: 1.55, letterSpacing: "-0.02em", color: "#fff", minHeight: 80 }} placeholder="One or two sentences a member sees on the card." value={form.summary} onChange={(e) => set("summary", e.target.value)} />

      <p className="t-eyebrow mt-7">Job description</p>
      <textarea className="textarea mt-3" style={{ fontSize: 16, minHeight: 180 }} placeholder="What they'll do, who they'll work with, what's useful to know. Blank lines make paragraphs." value={form.description} onChange={(e) => set("description", e.target.value)} />
      <p className="m-0 mt-6 text-[15px] text-muted">Blank lines become paragraphs. Members see the summary on the card and the full description on the posting.</p>

      <Hairline className="my-6" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="t-eyebrow">Application questions · {form.questions.length}</p>
          <p className="m-0 mt-2 text-[15px] text-muted">Optional. Members answer these when they apply; answers show up next to their resume.</p>
        </div>
        <Pill size="xs" onClick={() => set("questions", [...form.questions, { id: `q${Date.now().toString(36)}`, label: "", type: "short", required: true }])} disabled={form.questions.length >= MAX_QUESTIONS}>
          + Add question
        </Pill>
      </div>
      {form.questions.length > 0 && (
        <div className="mt-4 flex flex-col gap-2.5">
          {form.questions.map((q, i) => (
            <div key={q.id} className="row" style={{ padding: "14px 16px" }}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[13px] font-semibold text-muted">{i + 1}.</span>
                <input
                  className="input"
                  style={{ flex: "1 1 260px", width: "auto" }}
                  placeholder={q.type === "long" ? "e.g. Why this project? (a short paragraph)" : "e.g. Link to something you've shipped"}
                  value={q.label}
                  onChange={(e) => set("questions", form.questions.map((x) => (x.id === q.id ? { ...x, label: e.target.value } : x)))}
                />
                <div className="flex gap-1.5">
                  <Chip on={q.type === "short"} onClick={() => set("questions", form.questions.map((x) => (x.id === q.id ? { ...x, type: "short" } : x)))}>Short</Chip>
                  <Chip on={q.type === "long"} onClick={() => set("questions", form.questions.map((x) => (x.id === q.id ? { ...x, type: "long" } : x)))}>Paragraph</Chip>
                  <Chip on={!q.required} onClick={() => set("questions", form.questions.map((x) => (x.id === q.id ? { ...x, required: !x.required } : x)))}>Optional</Chip>
                </div>
                <button type="button" className="pill pill-ghost pill-xs" onClick={() => set("questions", form.questions.filter((x) => x.id !== q.id))} aria-label="Remove question">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-7 flex flex-wrap gap-3">
        <Pill tone="blue" onClick={() => save()} disabled={busy}>{busy ? "Saving…" : isNew ? "Create posting" : "Update posting"}</Pill>
        {form.status !== "live" && <Pill onClick={() => save({ status: "live" })} disabled={busy}>Publish now</Pill>}
        {!isNew && <Pill href={`/admin/opportunities/${form.id}/applicants`}>View {applicantCount} applicant{applicantCount === 1 ? "" : "s"}</Pill>}
        <Pill href="/admin/opportunities">Back to opportunities</Pill>
        {saved && <span className="self-center text-[13px] text-ok">{saved}</span>}
        {employer && !form.teams.length && <span className="self-center text-[13px] text-muted">Tip: pick the field teams so the right members see it.</span>}
      </div>
      {error && <p className="m-0 mt-3 text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</p>}
    </div>
  );
}

function Prop({ label, children, align = "center" }: { label: string; children: React.ReactNode; align?: "center" | "start" }) {
  return (
    <div className="flex flex-wrap gap-4 py-2" style={{ alignItems: align === "start" ? "flex-start" : "center" }}>
      <span className="shrink-0 text-[13px] text-muted" style={{ width: 150, paddingTop: align === "start" ? 4 : 0 }}>{label}</span>
      {children}
    </div>
  );
}
