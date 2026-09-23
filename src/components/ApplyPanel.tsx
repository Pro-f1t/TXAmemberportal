"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/utils/api";
import { Badge, Pill } from "@/components/ui";

type ResumeOpt = { id: string; fileName: string; teams: string[]; isDefault: boolean };
type Question = { id: string; label: string; type: "short" | "long"; required: boolean };
type Existing = { status: string; label: string; resumeFileName: string; submittedAt: string; nextStep: string } | null;

/** Right-hand card on a posting: pick a resume and apply, or see your status. */
export default function ApplyPanel({
  opportunityId, open, resumes, preselectedId, primaryTeam, existing, questions = [],
}: {
  opportunityId: string; open: boolean; resumes: ResumeOpt[]; preselectedId: string | null; primaryTeam: string | null; existing: Existing; questions?: Question[];
}) {
  const router = useRouter();
  const [resumeId, setResumeId] = useState(preselectedId ?? resumes[0]?.id ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const missing = questions.find((q) => q.required && !(answers[q.id] ?? "").trim());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/applications", "POST", { opportunityId, resumeId, answers });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
      setBusy(false);
    }
  };

  return (
    <div className="card min-w-0" style={{ padding: 28 }}>
      {existing ? (
        <>
          <p className="t-eyebrow">Your application</p>
          <div className="mt-3.5 flex flex-wrap items-center gap-3">
            <Badge tone={existing.status === "declined" ? "danger" : existing.status === "placed" || existing.status === "offer" ? "ok" : existing.status === "interview" ? "accent" : "warn"}>{existing.label}</Badge>
            <span className="text-[13px] text-muted">Submitted {existing.submittedAt}</span>
          </div>
          <p className="m-0 mt-4 text-[15px] leading-[1.55] text-muted">Sent with <span className="text-white">{existing.resumeFileName}</span>.</p>
          {existing.nextStep && <p className="m-0 mt-2 text-[15px] leading-[1.55] text-muted">{existing.nextStep}</p>}
          <div className="mt-5"><Pill href="/applications" tone="blue" size="sm">My applications</Pill></div>
        </>
      ) : !open ? (
        <>
          <p className="t-eyebrow">Applications closed</p>
          <p className="m-0 mt-3.5 text-[15px] leading-[1.55] text-muted">This posting is no longer accepting applications.</p>
        </>
      ) : resumes.length === 0 ? (
        <>
          <p className="t-eyebrow">Apply</p>
          <p className="m-0 mt-3.5 text-[15px] leading-[1.55] text-muted">Upload a resume to your profile first — employers see the resume attached to the team they posted under.</p>
          <div className="mt-5"><Pill href="/profile#resumes" tone="blue" size="sm">Upload a resume</Pill></div>
        </>
      ) : (
        <>
          <p className="t-eyebrow">Apply</p>
          <p className="m-0 mt-3.5 text-[15px] leading-[1.55] text-muted">
            Choose which resume to send.{primaryTeam ? ` Your ${primaryTeam} resume is preselected.` : ""}
          </p>
          <div className="mt-4 flex flex-col gap-2.5">
            {resumes.map((r) => {
              const on = r.id === resumeId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setResumeId(r.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl text-left transition-colors"
                  style={{ background: on ? "rgba(96,165,250,0.15)" : "var(--color-surface-2)", padding: "14px 16px", outline: on ? "1px solid rgba(96,165,250,0.6)" : "none" }}
                  aria-pressed={on}
                >
                  <span className="text-[15px] font-semibold" style={{ color: on ? "#fff" : undefined }}>{r.fileName}</span>
                  <span className="text-[12px] text-muted">{r.teams.length ? r.teams.join(", ") : r.isDefault ? "Default" : "Unassigned"}</span>
                </button>
              );
            })}
          </div>
          {questions.length > 0 && (
            <div className="mt-5 flex flex-col gap-3.5">
              <p className="t-eyebrow">A few questions</p>
              {questions.map((q) => (
                <label key={q.id} className="flex flex-col gap-2">
                  <span className="text-[14px] font-medium">{q.label}{q.required ? "" : <span className="text-muted"> (optional)</span>}</span>
                  {q.type === "long" ? (
                    <textarea className="textarea" style={{ minHeight: 96 }} value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
                  ) : (
                    <input className="input" value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
                  )}
                </label>
              ))}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Pill tone="blue" size="sm" onClick={submit} disabled={busy || !resumeId || !!missing} title={missing ? `Answer: ${missing.label}` : undefined}>{busy ? "Submitting…" : "Submit application"}</Pill>
            <Link href="/profile#resumes" className="pill pill-ghost pill-sm">Manage resumes</Link>
          </div>
          {error && <p className="m-0 mt-3 text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</p>}
        </>
      )}
    </div>
  );
}
