"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/utils/api";
import { ApplicationStatus } from "@/lib/models/Portal";
import { Badge, Chip, Pill } from "@/components/ui";
import { fmtDate } from "@/lib/utils/format";
import DatePicker from "@/components/DatePicker";

type App = { id: string; status: ApplicationStatus; nextStep: string; nextStepAt: string | null; joinLink: string; submittedAt: string; resumeFileName: string; answers?: { id: string; label: string; value: string }[] };

// The exec's chip group: Under review / Interview / Offer / Decline. Placed,
// declined, and complete show as badges (the member accepts the offer).
const CHIPS: { value: ApplicationStatus; label: string }[] = [
  { value: "under_review", label: "Under review" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "declined", label: "Decline" },
];

export default function ApplicationStatusRow({
  application, title, subtitle, memberHref, resumeUrl,
}: {
  application: App; title: string; subtitle: string; memberHref?: string; resumeUrl?: string;
}) {
  const router = useRouter();
  const [app, setApp] = useState(application);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState({ nextStep: app.nextStep, nextStepAt: app.nextStepAt, joinLink: app.joinLink });
  const answers = app.answers ?? [];
  const [showAnswers, setShowAnswers] = useState(true);

  const patch = async (body: Partial<{ status: ApplicationStatus; nextStep: string; nextStepAt: string | null; joinLink: string }>) => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/applications/${app.id}`, "PATCH", body);
      setApp((a) => ({ ...a, ...body }));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (s: ApplicationStatus) => {
    if (s === "declined" && !confirm("Decline this applicant? They'll see it on their applications page.")) return;
    patch({ status: s });
    if ((s === "interview" || s === "offer") && !open) setOpen(true);
  };

  const meta = [`Submitted ${fmtDate(new Date(app.submittedAt))}`, app.resumeFileName].filter(Boolean).join(" · ");
  const finalBadge = app.status === "placed" ? <Badge tone="ok">Placed</Badge> : app.status === "complete" ? <Badge tone="muted">Complete</Badge> : app.status === "declined" ? <Badge tone="danger">Declined</Badge> : null;

  return (
    <div className="row">
      <div className="row-wrap">
        <div className="min-w-0" style={{ flex: "1 1 220px" }}>
          <p className="m-0 text-[15px] font-semibold">{memberHref ? <Link href={memberHref} className="text-white hover:text-accent">{title}</Link> : title}</p>
          <p className="m-0 mt-1 text-[12px] text-muted">{[subtitle, meta].filter(Boolean).join(" · ")}</p>
        </div>
        {finalBadge ?? (
          <div className="flex flex-wrap gap-1.5">
            {CHIPS.map((c) => (
              <Chip key={c.value} on={app.status === c.value || (c.value === "under_review" && app.status === "submitted")} onClick={() => setStatus(c.value)}>{c.label}</Chip>
            ))}
          </div>
        )}
        <div className="flex gap-1.5">
          {resumeUrl && <Pill size="xs" href={resumeUrl} target="_blank">Resume</Pill>}
          {answers.length > 0 && <button type="button" className="pill pill-ghost pill-xs" onClick={() => setShowAnswers((v) => !v)} aria-expanded={showAnswers}>{showAnswers ? "Hide responses" : `Responses · ${answers.length}`}</button>}
          {!finalBadge && <button type="button" className="pill pill-ghost pill-xs" onClick={() => setOpen((v) => !v)} aria-expanded={open}>{open ? "Done" : "Next step"}</button>}
        </div>
      </div>
      {answers.length > 0 && showAnswers && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", padding: "14px 16px" }}>
          <p className="t-eyebrow">Responses</p>
          {answers.map((a) => (
            <div key={a.id}>
              <p className="m-0 text-[13px] font-medium text-muted">{a.label}</p>
              {a.value.trim() ? (
                <p className="m-0 mt-1 whitespace-pre-wrap text-[15px] leading-[1.55]">{a.value}</p>
              ) : (
                <p className="m-0 mt-1 text-[14px] italic text-muted">Left blank</p>
              )}
            </div>
          ))}
        </div>
      )}
      {open && !finalBadge && (
        <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))" }}>
          <label className="flex flex-col gap-2" style={{ gridColumn: "1 / -1" }}>
            <span className="t-label">What the member sees</span>
            <input className="input" placeholder="Interview Sep 12, 3:00 PM · Zoom. 30 minutes with the internal tools lead." value={details.nextStep} onChange={(e) => setDetails((d) => ({ ...d, nextStep: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="t-label">When</span>
            <DatePicker withTime defaultHour={15} value={details.nextStepAt ? new Date(details.nextStepAt) : null} onChange={(d) => setDetails((x) => ({ ...x, nextStepAt: d ? d.toISOString() : null }))} placeholder="Pick a date and time" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="t-label">Join link</span>
            <input className="input" placeholder="https://zoom.us/j/…" value={details.joinLink} onChange={(e) => setDetails((d) => ({ ...d, joinLink: e.target.value }))} />
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <Pill tone="blue" size="xs" onClick={() => patch(details)} disabled={busy}>{busy ? "Saving…" : "Save next step"}</Pill>
          </div>
        </div>
      )}
      {error && <p className="m-0 mt-2 text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</p>}
    </div>
  );
}
