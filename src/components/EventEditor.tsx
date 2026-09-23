"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/utils/api";
import { TEAMS, teamShort, Team } from "@/lib/models/Member";
import { EVENT_TYPES, EVENT_TYPE_LABEL, EventType, EventStatus } from "@/lib/models/Portal";
import { Badge, Chip, Eyebrow, Field, FieldGroup, Pill, ToggleRow } from "@/components/ui";
import DatePicker from "@/components/DatePicker";
import { centralDate } from "@/lib/utils/time";
import { toDateInput } from "@/lib/utils/format";

export type EventForm = {
  id: string; title: string; date: string; timeLabel: string; location: string; capacity: number | null; type: EventType;
  audienceTeams: Team[]; description: string; countsForAttendance: boolean; pinned: boolean; rsvpUrl: string; status: EventStatus; rsvpCount: number; attendedCount: number;
};

const BLANK: EventForm = { id: "", title: "", date: "", timeLabel: "", location: "", capacity: null, type: "workshop", audienceTeams: [], description: "", countsForAttendance: true, pinned: false, rsvpUrl: "", status: "draft", rsvpCount: 0, attendedCount: 0 };

export default function EventEditor({ event }: { event: EventForm | null }) {
  const router = useRouter();
  const [form, setForm] = useState<EventForm>(event ?? BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const isNew = !form.id;

  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleTeam = (t: Team) => set("audienceTeams", form.audienceTeams.includes(t) ? form.audienceTeams.filter((x) => x !== t) : [...form.audienceTeams, t]);

  const save = async (overrides: Partial<EventForm> = {}) => {
    setBusy(true);
    setError(null);
    setSaved(null);
    const payload = { ...form, ...overrides };
    if (!payload.title.trim()) { setError("Give the event a title."); setBusy(false); return; }
    if (!payload.date) { setError("Pick a date."); setBusy(false); return; }
    try {
      const res = await api<{ id: string }>("/api/admin/events", isNew ? "POST" : "PATCH", payload);
      if (isNew) {
        router.push(`/admin/events?id=${res.id}`);
      } else {
        setForm((f) => ({ ...f, ...overrides }));
        setSaved(overrides.status ? (overrides.status === "published" ? "Published" : "Unpublished") : "Saved");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card min-w-0" style={{ padding: 28 }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>{isNew ? "New event" : `Editing · ${event?.title}`}</Eyebrow>
        <Badge tone={form.status === "published" ? "ok" : "warn"}>{form.status === "published" ? "Published" : "Draft"}</Badge>
      </div>
      <div className="mt-5 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Field label="Title" span><input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Consulting Case Night" /></Field>
        <Field label="Date">
          <DatePicker
            value={form.date ? centralDate(Number(form.date.slice(0, 4)), Number(form.date.slice(5, 7)), Number(form.date.slice(8, 10))) : null}
            onChange={(d) => set("date", d ? toDateInput(d) : "")}
          />
        </Field>
        <Field label="Time"><input className="input" value={form.timeLabel} onChange={(e) => set("timeLabel", e.target.value)} placeholder="7:00 PM or All day" /></Field>
        <Field label="Location"><input className="input" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="GDC 2.216" /></Field>
        <Field label="Capacity"><input type="number" min={0} className="input" value={form.capacity ?? ""} onChange={(e) => set("capacity", e.target.value === "" ? null : Math.max(0, Number(e.target.value)))} placeholder="No limit" /></Field>
        <FieldGroup label="Type">
          {EVENT_TYPES.map((t) => <Chip key={t} on={form.type === t} onClick={() => set("type", t)}>{EVENT_TYPE_LABEL[t]}</Chip>)}
        </FieldGroup>
        <FieldGroup label="Visible to">
          <Chip on={form.audienceTeams.length === 0} onClick={() => set("audienceTeams", [])}>All members</Chip>
          {TEAMS.map((t) => <Chip key={t} on={form.audienceTeams.includes(t)} onClick={() => toggleTeam(t)}>{teamShort(t)}</Chip>)}
        </FieldGroup>
        <Field label="Short description (optional)" span><textarea className="textarea" style={{ minHeight: 90 }} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="One or two sentences. Members tap the event to read it." /></Field>
        <Field label="External RSVP link (optional)" span>
          <input className="input" type="url" value={form.rsvpUrl} onChange={(e) => set("rsvpUrl", e.target.value)} placeholder="https://forms.gle/… — members RSVP there instead of in the portal" />
        </Field>
        <ToggleRow label="Counts toward attendance requirement" on={form.countsForAttendance} onChange={(v) => set("countsForAttendance", v)} />
        <ToggleRow label="Pin to the top of Upcoming" on={form.pinned} onChange={(v) => set("pinned", v)} />
      </div>
      <div className="mt-[22px] flex flex-wrap gap-2.5">
        <Pill tone="blue" onClick={() => save()} disabled={busy}>{busy ? "Saving…" : isNew ? "Create event" : "Save changes"}</Pill>
        {form.status === "published" ? (
          <Pill onClick={() => save({ status: "draft" })} disabled={busy}>Unpublish</Pill>
        ) : (
          <Pill onClick={() => save({ status: "published" })} disabled={busy}>{isNew ? "Create and publish" : "Publish"}</Pill>
        )}
        {!isNew && <Pill href={`/admin/events/${form.id}/attendance`}>View {form.rsvpCount} RSVP{form.rsvpCount === 1 ? "" : "s"}</Pill>}
        {saved && <span className="self-center text-[13px] text-ok">{saved}</span>}
      </div>
      {error && <p className="m-0 mt-3 text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</p>}
    </div>
  );
}
