import Link from "next/link";
import { getAllMembers } from "@/lib/firebase/members";
import { TEAMS, Team, teamShort, resumeForTeam, STAFF_ROLES } from "@/lib/models/Member";
import { PageHeader, Pill, Card, Eyebrow, Badge, Row, RowText, Empty, Chip } from "@/components/ui";
import { fmtDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function AdminResumes({ searchParams }: { searchParams: Promise<{ team?: string; q?: string }> }) {
  const { team: teamParam, q = "" } = await searchParams;
  const team = TEAMS.includes(teamParam as Team) ? (teamParam as Team) : null;
  const members = (await getAllMembers()).filter((m) => m.status === "active" && !STAFF_ROLES.includes(m.role));
  const needle = q.trim().toLowerCase();
  const inTeam = members.filter((m) => (!team || m.teams.includes(team)) && (!needle || m.name.toLowerCase().includes(needle) || m.email.toLowerCase().includes(needle)));

  const rows = inTeam.map((m) => {
    const r = resumeForTeam(m, team);
    const kind: "team" | "default" | "missing" = !r ? "missing" : team && r.assignedTeams.includes(team) ? "team" : "default";
    return { m, r, kind };
  });
  const withResume = members.filter((m) => m.resumes.length > 0).length;
  const teamAssigned = members.reduce((n, m) => n + m.resumes.reduce((k, r) => k + r.assignedTeams.length, 0), 0);
  const missing = members.filter((m) => m.resumes.length === 0);
  const remindAll = missing.length ? `mailto:?bcc=${missing.map((m) => m.email).join(",")}&subject=${encodeURIComponent("Upload your resume to the TXA portal")}` : undefined;
  const href = (t: Team | null) => `/admin/resumes${t ? `?team=${encodeURIComponent(t)}` : ""}${needle ? `${t ? "&" : "?"}q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={`Exec console · Resume book · ${members.length} members`}
        title="Resume book"
        actions={<Pill href={`/api/admin/resumes/export${team ? `?team=${encodeURIComponent(team)}` : ""}`} tone="blue" target="_blank">Export {team ? teamShort(team) : "all"} as CSV</Pill>}
      />
      <form className="filter-bar" action="/admin/resumes" method="get">
        {team && <input type="hidden" name="team" value={team} />}
        <input className="input input-pill" name="q" defaultValue={q} style={{ flex: "1 1 220px", width: "auto" }} placeholder="Search members" />
        <div className="chip-scroll flex flex-wrap gap-2">
          <Link href={href(null)}><Chip on={!team}>All teams</Chip></Link>
          {TEAMS.map((t) => <Link key={t} href={href(t)}><Chip on={team === t}>{teamShort(t)}</Chip></Link>)}
        </div>
      </form>

      <div className="grid items-stretch gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}>
        <Card className="flex-1">
          <div className="flex flex-wrap justify-between gap-4">
            <Eyebrow>{team ? teamShort(team) : "All members"} · {rows.filter((x) => x.r).length} resumes</Eyebrow>
            <span className="text-[13px] text-muted">{team ? "Shows the resume each member assigned to this team" : "Shows each member's default resume"}</span>
          </div>
          <div className="mt-[18px] flex flex-col gap-2.5">
            {rows.length === 0 && <Empty>No members match.</Empty>}
            {rows.map(({ m, r, kind }) => (
              <Row key={m.uid}>
                <RowText title={<Link href={`/admin/members/${m.uid}`} className="text-white hover:text-accent">{m.name}</Link>} meta={r ? `${r.fileName} · ${kind === "team" ? "assigned to team" : "default"} · ${fmtDate(r.uploadedAt)}` : "No resume uploaded"} />
                {kind === "team" ? <Badge tone="ok">Team resume</Badge> : kind === "default" ? <Badge tone="muted">Default</Badge> : <Badge tone="danger">Missing</Badge>}
                {r ? <a href={r.url} target="_blank" rel="noreferrer" className="pill pill-ghost pill-xs">Open</a> : <a href={`mailto:${m.email}?subject=${encodeURIComponent("Upload your resume to the TXA portal")}`} className="pill pill-ghost pill-xs">Remind</a>}
              </Row>
            ))}
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <Eyebrow>Coverage</Eyebrow>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-baseline justify-between"><span className="text-[14px] text-muted">Members with a resume</span><span className="text-[24px] font-semibold" style={{ letterSpacing: "-0.02em" }}>{withResume} / {members.length}</span></div>
              <div className="flex items-baseline justify-between"><span className="text-[14px] text-muted">Team-assigned resumes</span><span className="text-[24px] font-semibold" style={{ letterSpacing: "-0.02em" }}>{teamAssigned}</span></div>
              <div className="flex items-baseline justify-between"><span className="text-[14px] text-muted">Missing</span><span className="text-[24px] font-semibold" style={{ letterSpacing: "-0.02em", color: missing.length ? "var(--color-danger)" : undefined }}>{missing.length}</span></div>
            </div>
            {remindAll && <div className="mt-[18px]"><Pill size="xs" href={remindAll}>Remind {missing.length} member{missing.length === 1 ? "" : "s"}</Pill></div>}
          </Card>
          <Card className="flex-1">
            <Eyebrow>By team</Eyebrow>
            <div className="mt-4 flex flex-col gap-2.5">
              {TEAMS.map((t) => {
                const tm = members.filter((m) => m.teams.includes(t));
                const assigned = tm.filter((m) => m.resumes.some((r) => r.assignedTeams.includes(t))).length;
                const none = tm.filter((m) => m.resumes.length === 0).length;
                return (
                  <Row key={t} href={`/admin/resumes?team=${encodeURIComponent(t)}`} className="justify-between" style={{ padding: "14px 18px" }}>
                    <p className="m-0 text-[15px] font-semibold">{teamShort(t)}</p>
                    <span className="text-[12px] text-muted">{tm.length} members · {assigned} team-assigned{none ? ` · ${none} missing` : ""}</span>
                  </Row>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
