"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/utils/api";
import { TEAMS, teamShort, Team, MemberRole, MemberStatus } from "@/lib/models/Member";
import { Badge, Chip, Eyebrow, Field, FieldGroup, Hairline, Pill } from "@/components/ui";
import { MAJORS, GRAD_YEARS, normaliseGrad } from "@/data/majors";
import { fmtDate, fmtBytes } from "@/lib/utils/format";

type ResumeT = { id: string; fileName: string; url: string; size: number; uploadedAt: string; assignedTeams: Team[]; isDefault: boolean };
type M = {
  uid: string; firstName: string; lastName: string; name: string; eid: string; email: string; phone: string; major: string; major2: string; gradDate: string; linkedin: string;
  teams: Team[]; role: MemberRole; director: boolean; title: string; status: MemberStatus; resumes: ResumeT[];
};

const STATUS_TONE = { active: "ok", pending: "warn", inactive: "muted" } as const;

/** Left card on member detail: every profile field editable by exec. */
export default function MemberEditor({ member, actorIsAdmin, actorUid }: { member: M; actorIsAdmin: boolean; actorUid: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: member.firstName, lastName: member.lastName, eid: member.eid, phone: member.phone, major: member.major, major2: member.major2, gradDate: normaliseGrad(member.gradDate), linkedin: member.linkedin, teams: member.teams, role: member.role, director: member.director, title: member.title, status: member.status });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const isSelf = actorUid === member.uid;

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api(`/api/admin/members/${member.uid}`, "PATCH", form);
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card min-w-0 flex flex-col" style={{ padding: 28 }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>Profile</Eyebrow>
        <Badge tone={STATUS_TONE[form.status]}>{form.status === "active" ? "Active" : form.status === "pending" ? "Pending" : "Inactive"}</Badge>
      </div>
      <div className="mt-5 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Field label="First name"><input className="input" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
        <Field label="Last name"><input className="input" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
        <Field label="UT EID"><input className="input" value={form.eid} onChange={(e) => set("eid", e.target.value)} /></Field>
        <Field label="Email"><input className="input" value={member.email} readOnly style={{ color: "var(--color-muted)" }} /></Field>
        <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Major">
          <select className="select" value={form.major} onChange={(e) => set("major", e.target.value)}>
            <option value="">Select…</option>
            {MAJORS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Second major">
          <select className="select" value={form.major2} onChange={(e) => set("major2", e.target.value)}>
            <option value="">None</option>
            {MAJORS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Graduation">
          <select className="select" value={form.gradDate} onChange={(e) => set("gradDate", e.target.value)}>
            <option value="">Select…</option>
            {GRAD_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="LinkedIn" span><input className="input" value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="linkedin.com/in/…" /></Field>
        <FieldGroup label="Field teams">
          {TEAMS.map((t) => <Chip key={t} on={form.teams.includes(t)} onClick={() => set("teams", form.teams.includes(t) ? form.teams.filter((x) => x !== t) : [...form.teams, t])}>{teamShort(t)}</Chip>)}
        </FieldGroup>
        <div id="role" style={{ gridColumn: "1 / -1" }} className="flex flex-col gap-2">
          <span className="t-label">Role</span>
          <div className="flex flex-wrap gap-2">
            <Chip on={form.role === "member"} onClick={() => { if (!isSelf) { set("role", "member"); set("director", false); } }}>Member</Chip>
            <Chip on={form.role === "lead"} onClick={() => { if (!isSelf) { set("role", "lead"); set("director", false); } }}>Field team lead</Chip>
            <Chip on={form.role === "exec"} onClick={() => !isSelf && set("role", "exec")}>Exec</Chip>
            {form.role === "admin" && <Chip on>Admin</Chip>}
          </div>
          {form.role === "exec" && !isSelf && <p className="m-0 text-[12px] text-muted">Execs can open the console, post, and manage members.</p>}
          {isSelf && <p className="m-0 text-[12px] text-muted">You can&apos;t change your own role.</p>}
        </div>
        {(form.role === "exec" || form.role === "admin") && (
          <>
            <div style={{ gridColumn: "1 / -1" }} className="flex flex-col gap-2">
              <span className="t-label">Tier</span>
              <div className="flex flex-wrap gap-2">
                <Chip on={!form.director} onClick={() => !isSelf && set("director", false)}>Exec</Chip>
                <Chip on={form.director} onClick={() => !isSelf && set("director", true)}>Director</Chip>
              </div>
              <p className="m-0 text-[12px] text-muted">Directors are listed first with their own badge. Same console access as exec.</p>
            </div>
            <Field label="Title (optional)" span><input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Director of Operations" /></Field>
          </>
        )}
        <FieldGroup label="Membership">
          {(["active", "pending", "inactive"] as MemberStatus[]).map((s) => <Chip key={s} on={form.status === s} onClick={() => !isSelf && set("status", s)}>{s === "active" ? "Active" : s === "pending" ? "Pending" : "Inactive"}</Chip>)}
        </FieldGroup>
      </div>
      <div id="save" className="mt-5 flex flex-wrap items-center gap-2.5">
        <Pill tone="blue" size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Pill>
        {saved && <span className="text-[13px] text-ok">Saved</span>}
        {error && <span className="text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</span>}
      </div>

      <Hairline className="my-6" />
      <Eyebrow>Resumes · {member.resumes.length}</Eyebrow>
      <div className="mt-3.5 flex flex-col gap-2.5">
        {member.resumes.length === 0 && <p className="m-0 text-[15px] text-muted">No resume uploaded.</p>}
        {member.resumes.map((r) => (
          <div key={r.id} className="row row-wrap">
            <div className="min-w-0" style={{ flex: "1 1 220px" }}>
              <p className="m-0 text-[15px] font-semibold">{r.fileName}</p>
              <p className="m-0 mt-1 text-[12px] text-muted">{fmtDate(new Date(r.uploadedAt))} · {fmtBytes(r.size)}</p>
            </div>
            {r.assignedTeams.map((t) => <Chip key={t} on>{teamShort(t)}</Chip>)}
            {r.isDefault && <Badge tone="muted">Default</Badge>}
            <a href={r.url} target="_blank" rel="noreferrer" className="pill pill-ghost pill-xs">View</a>
          </div>
        ))}
      </div>
    </div>
  );
}
