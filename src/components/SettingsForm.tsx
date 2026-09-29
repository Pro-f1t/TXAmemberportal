"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/utils/api";
import { PortalConfig } from "@/lib/models/Portal";
import { Card, Eyebrow, Field, Pill } from "@/components/ui";
import SignupToggle from "@/components/SignupToggle";

export default function SettingsForm({ config, feedUrl }: { config: PortalConfig; feedUrl: string }) {
  const router = useRouter();
  const [form, setForm] = useState(config);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof PortalConfig>(k: K, v: PortalConfig[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      // Only this card's fields. Sign-up approval saves itself instantly (SignupToggle).
      await api("/api/admin/config", "PATCH", { season: form.season, week: form.week, calendarUrl: form.calendarUrl });
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid items-start gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}>
      <Card>
        <Eyebrow>Sign-ups</Eyebrow>
        <p className="m-0 mt-2 text-[15px] text-muted">
          Turn approval off during a GM so everyone in the room can sign in and get straight in. Changes save as soon as you click.
        </p>
        <div className="mt-4"><SignupToggle requireApproval={config.requireApproval} /></div>
      </Card>

      <Card>
        <Eyebrow>Calendar</Eyebrow>
        <p className="m-0 mt-2 text-[15px] text-muted">
          Where the members&apos; &ldquo;Subscribe to Google Calendar&rdquo; button goes. Leave it blank to use the portal&apos;s own event feed through Google&apos;s add-by-URL flow.
        </p>
        <div className="mt-4">
          <Field label="Google Calendar link (optional)">
            <input className="input" type="url" value={form.calendarUrl} onChange={(e) => set("calendarUrl", e.target.value)} placeholder="https://calendar.google.com/calendar/u/0?cid=…" />
          </Field>
        </div>
        <p className="m-0 mt-3 text-[12px] text-muted">Portal feed: <span className="text-white break-all">{feedUrl}</span></p>
      </Card>

      <Card>
        <Eyebrow>Season</Eyebrow>
        <div className="mt-4 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))" }}>
          <Field label="Season label" span><input className="input" value={form.season} onChange={(e) => set("season", e.target.value)} placeholder="Fall 2026" /></Field>
          <Field label="Current week"><input className="input" type="number" min={0} max={52} value={form.week} onChange={(e) => set("week", Number(e.target.value))} /></Field>
        </div>
        <p className="m-0 mt-3 text-[12px] text-muted">Shown on the Home hero.</p>
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <Pill tone="blue" size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</Pill>
          {saved && <span className="text-[13px] text-ok">Saved</span>}
          {error && <span className="text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</span>}
        </div>
      </Card>
    </div>
  );
}
