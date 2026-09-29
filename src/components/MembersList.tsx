"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/utils/api";
import { TEAMS, teamShort, Team, MemberRole } from "@/lib/models/Member";
import { Badge, Card, Chip, Eyebrow, Field, Pill, Row, Empty } from "@/components/ui";
import SignupToggle from "@/components/SignupToggle";

export type MemberRowData = {
  uid: string; name: string; email: string; eid: string; role: MemberRole; teams: Team[]; meta: string; counts: string;
  flag: "active" | "pending" | "inactive" | "director" | "exec" | "noresume";
};
type InviteData = { email: string; name: string; teams: Team[]; role: MemberRole };

const FLAG = {
  active: { tone: "ok", label: "Active" },
  pending: { tone: "warn", label: "Pending" },
  inactive: { tone: "muted", label: "Inactive" },
  director: { tone: "solid", label: "Director" },
  exec: { tone: "accent", label: "Exec" },
  noresume: { tone: "danger", label: "No resume" },
} as const;

/** Search + team chips over the roster, plus the invite form and pending list. */
export default function MembersList({ rows, invites, initialTeam, showInvite, requireApproval }: { rows: MemberRowData[]; invites: InviteData[]; initialTeam: string; showInvite: boolean; requireApproval: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [team, setTeam] = useState<Team | "">(TEAMS.includes(initialTeam as Team) ? (initialTeam as Team) : "");
  const [inviteOpen, setInviteOpen] = useState(showInvite);
  const [inv, setInv] = useState<{ email: string; name: string; teams: Team[]; role: MemberRole }>({ email: "", name: "", teams: [], role: "member" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const PAGE = 25;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => (!team || r.teams.includes(team)) && (!needle || r.name.toLowerCase().includes(needle) || r.email.toLowerCase().includes(needle) || r.eid.toLowerCase().includes(needle)));
  }, [rows, q, team]);
  const pending = shown.filter((r) => r.flag === "pending");
  const rest = shown.filter((r) => r.flag !== "pending");

  const sendInvite = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/invites", "POST", inv);
      setInv({ email: "", name: "", teams: [], role: "member" });
      setInviteOpen(false);
      router.replace("/admin/members");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add.");
    } finally {
      setBusy(false);
    }
  };
  const removeInvite = async (email: string) => {
    if (!confirm(`Remove the invite for ${email}?`)) return;
    await api("/api/admin/invites", "DELETE", { email });
    router.refresh();
  };

  return (
    <>
      <div className="filter-bar">
        <input className="input input-pill" style={{ flex: "1 1 260px", width: "auto" }} placeholder="Search by name, EID, or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chip-scroll flex flex-wrap gap-2">
          <Chip on={team === ""} onClick={() => setTeam("")}>All teams</Chip>
          {TEAMS.map((t) => <Chip key={t} on={team === t} onClick={() => setTeam(t)}>{teamShort(t)}</Chip>)}
        </div>
      </div>

      {inviteOpen && (
        <Card>
          <Eyebrow>Add a member</Eyebrow>
          <p className="m-0 mt-2 text-[15px] text-muted">Enter the Google email they&apos;ll sign in with. Their account is active the moment they sign in, with these teams and role.</p>
          <div className="mt-4 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))" }}>
            <Field label="Email"><input className="input" type="email" value={inv.email} onChange={(e) => setInv((i) => ({ ...i, email: e.target.value }))} placeholder="name@utexas.edu" /></Field>
            <Field label="Name"><input className="input" value={inv.name} onChange={(e) => setInv((i) => ({ ...i, name: e.target.value }))} placeholder="Full name" /></Field>
          </div>
          <p className="t-label mt-4">Field teams</p>
          <div className="mt-2 flex flex-wrap gap-2">{TEAMS.map((t) => <Chip key={t} on={inv.teams.includes(t)} onClick={() => setInv((i) => ({ ...i, teams: i.teams.includes(t) ? i.teams.filter((x) => x !== t) : [...i.teams, t] }))}>{teamShort(t)}</Chip>)}</div>
          <p className="t-label mt-4">Role</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["member", "lead", "exec"] as MemberRole[]).map((r) => <Chip key={r} on={inv.role === r} onClick={() => setInv((i) => ({ ...i, role: r }))}>{r === "member" ? "Member" : r === "lead" ? "Field team lead" : "Exec"}</Chip>)}
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Pill tone="blue" size="sm" onClick={sendInvite} disabled={busy || !inv.email}>{busy ? "Adding…" : "Add member"}</Pill>
            <Pill size="sm" onClick={() => { setInviteOpen(false); router.replace("/admin/members"); }}>Cancel</Pill>
          </div>
          {error && <p className="m-0 mt-3 text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</p>}
        </Card>
      )}

      <Card>
        <Eyebrow>Sign-ups</Eyebrow>
        <div className="mt-4"><SignupToggle requireApproval={requireApproval} /></div>
      </Card>

      {pending.length > 0 && (
        <Card>
          <Eyebrow>Waiting for approval · {pending.length}</Eyebrow>
          <p className="m-0 mt-2 text-[15px] text-muted">Signed in with Google but not yet a member. Open one to set their teams and activate, or delete duplicates and people you don&apos;t know.</p>
          <div className="mt-4 flex flex-col gap-2.5">
            {pending.map((r) => <PendingRow key={r.uid} r={r} />)}
          </div>
        </Card>
      )}

      {invites.length > 0 && (
        <Card>
          <Eyebrow>Invited · {invites.length}</Eyebrow>
          <div className="mt-4 flex flex-col gap-2.5">
            {invites.map((i) => (
              <Row key={i.email}>
                <div className="min-w-0" style={{ flex: "1 1 220px" }}>
                  <p className="m-0 text-[15px] font-semibold">{i.name || i.email}</p>
                  <p className="m-0 mt-1 text-[12px] text-muted">{[i.email, i.teams.map(teamShort).join(", "), i.role !== "member" ? i.role : ""].filter(Boolean).join(" · ")}</p>
                </div>
                <Badge tone="muted">Not signed in yet</Badge>
                <button type="button" className="pill pill-ghost pill-xs" onClick={() => removeInvite(i.email)}>Remove</button>
              </Row>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap justify-between gap-4">
          <Eyebrow>Name · Teams · Applications · Attendance · Resumes</Eyebrow>
          <span className="text-[13px] text-muted">Sorted A–Z</span>
        </div>
        <div className="mt-[18px] flex flex-col gap-2.5">
          {rest.length === 0 && <Empty>No members match.</Empty>}
          {(showAll ? rest : rest.slice(0, PAGE)).map((r) => <MemberRow key={r.uid} r={r} />)}
        </div>
        {rest.length > PAGE && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="pill pill-ghost pill-xs mt-3" aria-expanded={showAll}>
            {showAll ? "Show fewer" : `Show ${rest.length - PAGE} more members`}
          </button>
        )}
      </Card>
    </>
  );
}

/** A pending sign-up: open to activate, or delete a duplicate / stranger outright. */
function PendingRow({ r }: { r: MemberRowData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  const remove = async () => {
    if (!confirm(`Delete ${r.name === "NA" ? r.email : r.name}'s account (${r.email})? It can't be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/admin/members/${r.uid}`, "DELETE");
      setGone(true);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not delete the account.");
      setBusy(false);
    }
  };
  if (gone) return null;
  return (
    <Row>
      <div className="min-w-0" style={{ flex: "1 1 220px" }}>
        <p className="m-0 text-[15px] font-semibold">{r.name === "NA" ? r.email : r.name}</p>
        <p className="m-0 mt-1 truncate text-[12px] text-muted">{r.email}</p>
      </div>
      <Badge tone="warn">Pending</Badge>
      <Link href={`/admin/members/${r.uid}`} className="pill pill-ghost pill-xs">Open</Link>
      <button type="button" onClick={remove} disabled={busy} className="pill pill-ghost pill-xs" style={{ color: "var(--color-danger)" }}>{busy ? "…" : "Delete"}</button>
    </Row>
  );
}

function MemberRow({ r }: { r: MemberRowData }) {
  const f = FLAG[r.flag];
  return (
    <Row href={`/admin/members/${r.uid}`}>
      <div className="min-w-0" style={{ flex: "1 1 220px" }}>
        <p className="m-0 text-[15px] font-semibold">{r.name}</p>
        <p className="m-0 mt-1 text-[12px] text-muted">{r.meta || r.email}</p>
      </div>
      <span className="text-[13px] text-muted">{r.counts}</span>
      <Badge tone={f.tone}>{f.label}</Badge>
      <span className="hide-phone pill pill-ghost pill-xs">Open</span>
    </Row>
  );
}

