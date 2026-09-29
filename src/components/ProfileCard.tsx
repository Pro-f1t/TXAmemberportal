"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/utils/api";
import { uploadViaApi, shrinkImage } from "@/lib/firebase/upload";
import { teamShort, Team } from "@/lib/models/Member";
import { MAJORS, GRAD_YEARS, normaliseGrad } from "@/data/majors";
import { Chip, Hairline, KeyValue, Pill, Field } from "@/components/ui";
import { CameraIcon } from "@/components/Icons";
import { fmtMonthYear } from "@/lib/utils/format";

type M = {
  uid: string; name: string; firstName: string; lastName: string; email: string; phone: string; eid: string; linkedin: string;
  major: string; major2: string; gradDate: string; teams: Team[]; photoUrl: string; memberSince: string;
};

/** Top of My profile: photo, name, meta, team chips, key/values — editable in place. */
export default function ProfileCard({ member }: { member: M }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: member.firstName, lastName: member.lastName, phone: member.phone, eid: member.eid, linkedin: member.linkedin, major: member.major, major2: member.major2, gradDate: normaliseGrad(member.gradDate) });
  const [doubleMajor, setDoubleMajor] = useState(!!member.major2);
  const [photo, setPhoto] = useState(member.photoUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/profile", "PATCH", form);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { setError("Photo must be a PNG or JPEG."); return; }
    setBusy(true);
    setError(null);
    try {
      const { url } = await uploadViaApi("/api/profile/photo", await shrinkImage(file));
      setPhoto(url);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const displayName = `${member.firstName} ${member.lastName}`.trim() || member.name;
  const linkedinLabel = member.linkedin ? member.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com/, "") : "";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative block shrink-0 overflow-hidden rounded-3xl"
          style={{ width: 168, height: 210, background: "var(--color-surface-2)", outline: photo ? "none" : "2px dashed rgba(96,165,250,0.5)", outlineOffset: -2 }}
          title={photo ? "Change your headshot" : "Upload a headshot"}
          aria-label={photo ? "Change your headshot" : "Upload a headshot"}
          disabled={busy}
        >
          {photo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={displayName} className="h-full w-full object-cover object-top" />
              <span className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100" style={{ background: "rgba(8,5,15,0.6)" }}>Change</span>
            </>
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-accent">
              <CameraIcon className="h-6 w-6" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">Add photo</span>
            </span>
          )}
        </button>
        <div className="min-w-0">
          <p className="m-0 text-[14px] font-semibold">{photo ? "Your headshot" : "Add a headshot"}</p>
          <p className="m-0 mt-1 text-[12px] text-muted">Professional headshot preferred.</p>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="pill pill-ghost pill-xs mt-2.5">
            {busy ? "Uploading…" : photo ? "Change photo" : "Upload headshot"}
          </button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />

      <h2 className="t-h2 mt-5">{displayName}</h2>
      <p className="m-0 mt-2 text-[16px] text-muted">
        {[[member.major, member.major2].filter(Boolean).join(" & "), member.gradDate, member.memberSince ? `Member since ${fmtMonthYear(new Date(member.memberSince))}` : ""].filter(Boolean).join(" · ") || "Add your major and graduation date"}
      </p>

      {!editing ? (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {member.teams.length === 0 && <span className="text-[13px] text-muted">No field team yet. Exec assigns these.</span>}
            {member.teams.map((t) => <Chip key={t} on size="lg">{teamShort(t)}</Chip>)}
          </div>
          <Hairline className="my-6" />
          <div className="flex flex-col gap-3.5">
            <KeyValue k="Email" v={member.email} />
            <KeyValue k="Phone" v={member.phone} />
            <KeyValue k="UT EID" v={member.eid} />
            <KeyValue k="LinkedIn" v={linkedinLabel} />
          </div>
          <div className="mt-7"><Pill onClick={() => setEditing(true)}>Edit details</Pill></div>
        </>
      ) : (
        <>
          <div className="mt-5 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))" }}>
            <Field label="First name"><input className="input" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
            <Field label="Last name"><input className="input" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
            <Field label="Major" span>
              <select className="select" value={form.major} onChange={(e) => set("major", e.target.value)}>
                <option value="">Select your major…</option>
                {MAJORS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {!doubleMajor ? (
                <button type="button" onClick={() => setDoubleMajor(true)} className="self-start text-[13px] font-medium text-accent">+ I&apos;m double majoring</button>
              ) : (
                <div className="mt-1 flex flex-col gap-2">
                  <span className="t-label">Second major</span>
                  <select className="select" value={form.major2} onChange={(e) => set("major2", e.target.value)}>
                    <option value="">Select your second major…</option>
                    {MAJORS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <button type="button" onClick={() => { setDoubleMajor(false); set("major2", ""); }} className="self-start text-[13px] text-muted hover:text-white">Remove second major</button>
                </div>
              )}
            </Field>
            <Field label="Graduation">
              <select className="select" value={form.gradDate} onChange={(e) => set("gradDate", e.target.value)}>
                <option value="">Select…</option>
                {GRAD_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(512) 555-0100" /></Field>
            <Field label="UT EID"><input className="input" value={form.eid} onChange={(e) => set("eid", e.target.value)} placeholder="ab12345" /></Field>
            <Field label="LinkedIn"><input className="input" value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="linkedin.com/in/you" /></Field>
          </div>
          <p className="m-0 mt-4 text-[12px] text-muted">Field teams are assigned by exec.</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Pill tone="blue" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Pill>
            <Pill onClick={() => { setEditing(false); setError(null); }} disabled={busy}>Cancel</Pill>
          </div>
        </>
      )}
      {error && <p className="m-0 mt-3 text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</p>}
    </div>
  );
}
