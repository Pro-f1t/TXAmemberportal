"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/utils/api";
import { TEAMS, teamShort, Team } from "@/lib/models/Member";
import { ANNOUNCEMENT_LABELS, ANNOUNCEMENT_LABEL_TEXT, AnnouncementLabel, AnnouncementStatus } from "@/lib/models/Portal";
import { Badge, Chip, Eyebrow, Field, FieldGroup, Pill, ToggleRow } from "@/components/ui";
import DatePicker from "@/components/DatePicker";

export type AnnouncementForm = {
  id: string; title: string; body: string; label: AnnouncementLabel; audienceTeams: Team[]; status: AnnouncementStatus;
  publishAt: string | null; expiresAt: string | null; emailMembers: boolean;
};

const BLANK: AnnouncementForm = { id: "", title: "", body: "", label: "update", audienceTeams: [], status: "draft", publishAt: null, expiresAt: null, emailMembers: false };

export default function AnnouncementEditor({ announcement }: { announcement: AnnouncementForm | null }) {
  const router = useRouter();
  const [form, setForm] = useState<AnnouncementForm>(announcement ?? BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const isNew = !form.id;

  const set = <K extends keyof AnnouncementForm>(k: K, v: AnnouncementForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleTeam = (t: Team) => set("audienceTeams", form.audienceTeams.includes(t) ? form.audienceTeams.filter((x) => x !== t) : [...form.audienceTeams, t]);

  const save = async (overrides: Partial<AnnouncementForm>, label: string) => {
    setBusy(true);
    setError(null);
    setSaved(null);
    const payload = { ...form, ...overrides };
    if (!payload.title.trim()) { setError("Give it a title."); setBusy(false); return; }
    try {
      const res = await api<{ id: string }>("/api/admin/announcements", isNew ? "POST" : "PATCH", payload);
      if (isNew) {
        router.push(`/admin/announcements?id=${res.id}`);
      } else {
        setForm((f) => ({ ...f, ...overrides }));
        setSaved(label);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  // "Save and publish": live now, or scheduled if a future publish time is set.
  const publish = () => {
    const future = form.publishAt && new Date(form.publishAt).getTime() > Date.now();
    save({ status: future ? "scheduled" : "live", publishAt: future ? form.publishAt : new Date().toISOString() }, future ? "Scheduled" : "Published");
  };

  return (
    <div className="card min-w-0" style={{ padding: 28 }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>{isNew ? "New announcement" : `Editing · ${announcement?.title}`}</Eyebrow>
        {form.status === "draft" ? <Badge tone="muted">Draft</Badge> : form.status === "scheduled" ? <Badge tone="warn">Scheduled</Badge> : form.label === "pinned" ? <Badge tone="accent">Pinned</Badge> : <Badge tone="ok">Live</Badge>}
      </div>
      <div className="mt-5 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Field label="Title" span><input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Four new postings are live" /></Field>
        <Field label="Body" span><textarea className="textarea" value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="What members need to know, in two or three sentences." /></Field>
        <FieldGroup label="Label">
          {ANNOUNCEMENT_LABELS.map((l) => <Chip key={l} on={form.label === l} onClick={() => set("label", l)}>{ANNOUNCEMENT_LABEL_TEXT[l]}</Chip>)}
        </FieldGroup>
        <FieldGroup label="Audience">
          <Chip on={form.audienceTeams.length === 0} onClick={() => set("audienceTeams", [])}>All members</Chip>
          {TEAMS.map((t) => <Chip key={t} on={form.audienceTeams.includes(t)} onClick={() => toggleTeam(t)}>{teamShort(t)}</Chip>)}
        </FieldGroup>
        <Field label="Publish">
          <DatePicker withTime defaultHour={9} value={form.publishAt ? new Date(form.publishAt) : null} onChange={(d) => set("publishAt", d ? d.toISOString() : null)} placeholder="Now" />
        </Field>
        <Field label="Expires">
          <DatePicker defaultHour={23} value={form.expiresAt ? new Date(form.expiresAt) : null} onChange={(d) => set("expiresAt", d ? d.toISOString() : null)} placeholder="Never" />
        </Field>
        <ToggleRow label="Also email members" on={form.emailMembers} onChange={(v) => set("emailMembers", v)} />
        {form.emailMembers && <p className="m-0 text-[12px] text-muted" style={{ gridColumn: "1 / -1" }}>Email delivery isn&apos;t wired up yet — this flag is saved so it can be when it is.</p>}
      </div>
      <div className="mt-[22px] flex flex-wrap gap-2.5">
        <Pill tone="blue" onClick={publish} disabled={busy}>{busy ? "Saving…" : "Save and publish"}</Pill>
        <Pill onClick={() => save({ status: "draft" }, "Draft saved")} disabled={busy}>Save draft</Pill>
        {form.label === "pinned" && !isNew && <Pill onClick={() => save({ label: "update" }, "Unpinned")} disabled={busy}>Unpin</Pill>}
        {saved && <span className="self-center text-[13px] text-ok">{saved}</span>}
      </div>
      {error && <p className="m-0 mt-3 text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</p>}
    </div>
  );
}
