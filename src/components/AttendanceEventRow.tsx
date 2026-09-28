"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/utils/api";
import { DateBlock, Pill } from "@/components/ui";

type Ev = { id: string; title: string; date: string; meta: string; attended: number; rsvps: number };

/**
 * One event on the Attendance tab. The backup code is hidden until opened and
 * only works while armed (15 minutes, self-disarming) — Jamie doesn't want a
 * static code on screen by default.
 */
export default function AttendanceEventRow({ event, projectorUrl, backupSvg, backupRemainingMs, disabled }: { event: Ev; projectorUrl: string; backupSvg: string; backupRemainingMs: number; disabled: boolean }) {
  const [open, setOpen] = useState(backupRemainingMs > 0);
  const [remaining, setRemaining] = useState(backupRemainingMs);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const armed = remaining > 0;

  useEffect(() => {
    if (remaining <= 0) return;
    const iv = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(iv);
  }, [remaining]);

  const toggleArm = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/attendance/backup", "POST", { eventId: event.id, armed: !armed });
      setRemaining(armed ? 0 : 15 * 60 * 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't change the backup code.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(projectorUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the link manually.");
    }
  };

  const mm = Math.floor(remaining / 60000);
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  return (
    <div className="rounded-3xl" style={{ background: "var(--color-surface-2)", padding: "18px 20px" }}>
      <div className="flex flex-wrap items-center gap-4">
        <DateBlock date={new Date(event.date)} />
        <div className="min-w-0" style={{ flex: "1 1 220px" }}>
          <p className="m-0 text-[16px] font-semibold">{event.title}</p>
          <p className="m-0 mt-1 text-[12px] text-muted">{event.meta}</p>
          <p className="m-0 mt-1 text-[12px] text-muted"><span className="font-semibold text-white">{event.attended}</span> checked in · {event.rsvps} RSVP&apos;d</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="blue" size="sm" href={disabled ? undefined : `/live/${event.id}`} target="_blank" disabled={disabled}>Open live display ↗</Pill>
          {projectorUrl && <button type="button" className="pill pill-ghost pill-xs" onClick={copy} title="Works on a laptop that isn't signed in">{copied ? "Copied" : "Copy projector link"}</button>}
          <Pill size="xs" href={`/admin/events/${event.id}/attendance`}>Roster</Pill>
          <button type="button" className="pill pill-ghost pill-xs" onClick={() => setOpen((v) => !v)} aria-expanded={open} disabled={disabled}>{open ? "Hide backup" : "Backup code"}</button>
        </div>
      </div>

      {open && (
        <div className="mt-4 flex flex-wrap items-start gap-5 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {armed && <div className="shrink-0 rounded-2xl bg-white p-2" style={{ width: 168, height: 168 }} dangerouslySetInnerHTML={{ __html: backupSvg }} />}
          <div className="min-w-0" style={{ flex: "1 1 240px" }}>
            <p className="m-0 text-[14px] font-semibold">{armed ? `Backup code live · ${mm}:${ss} left` : "Backup code (break-glass)"}</p>
            <p className="m-0 mt-1 text-[13px] text-muted">
              {armed
                ? "Anyone with this code can check in until it disarms itself. Put it away once the room is done."
                : "For when the projector can't run. It's a fixed code, so it only works for 15 minutes after you arm it."}
            </p>
            <div className="mt-3">
              <Pill size="xs" tone={armed ? "ghost" : "blue"} onClick={toggleArm} disabled={busy}>{busy ? "…" : armed ? "Disarm now" : "Arm for 15 minutes"}</Pill>
            </div>
            {error && <p className="m-0 mt-2 text-[12px]" style={{ color: "var(--color-danger)" }}>{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
