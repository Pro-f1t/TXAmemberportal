import { getAllMembers, getInvites } from "@/lib/firebase/members";
import { getAllApplications, getAllEvents, getPortalConfig } from "@/lib/firebase/portal";
import { STAFF_ROLES, teamShort, byRoleThenName, isDirector } from "@/lib/models/Member";
import { splitEvents } from "@/lib/portal/memberData";
import { PageHeader, Pill } from "@/components/ui";
import MembersList, { MemberRowData } from "@/components/MembersList";

export const dynamic = "force-dynamic";

export default async function AdminMembers({ searchParams }: { searchParams: Promise<{ team?: string; invite?: string }> }) {
  const { team, invite } = await searchParams;
  const [members, invites, apps, events, config] = await Promise.all([getAllMembers(), getInvites(), getAllApplications(), getAllEvents(), getPortalConfig()]);
  const { past } = splitEvents(events.filter((e) => e.status === "published" && e.countsForAttendance));

  const rows: MemberRowData[] = [...members].sort(byRoleThenName).map((m) => {
    const attended = past.filter((e) => e.attendedUids.includes(m.uid)).length;
    const nApps = apps.filter((a) => a.userId === m.uid).length;
    const staff = STAFF_ROLES.includes(m.role);
    const flag: MemberRowData["flag"] =
      m.status === "pending" ? "pending"
      : m.status === "inactive" ? "inactive"
      : isDirector(m) ? "director"
      : staff ? "exec"
      : m.resumes.length === 0 ? "noresume"
      : "active";
    return {
      uid: m.uid, name: m.name, email: m.email, eid: m.eid, role: m.role, teams: m.teams,
      meta: [[m.major, m.major2].filter(Boolean).join(" & "), m.gradDate, m.title || (isDirector(m) ? "Director" : staff ? "Exec" : ""), m.teams.map(teamShort).join(", ")].filter(Boolean).join(" · "),
      counts: staff ? `${isDirector(m) ? "Director" : "Exec"} · ${attended} event${attended === 1 ? "" : "s"}` : `${nApps} application${nApps === 1 ? "" : "s"} · ${attended} event${attended === 1 ? "" : "s"} · ${m.resumes.length} resume${m.resumes.length === 1 ? "" : "s"}`,
      flag,
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={`Exec console · Members · ${members.filter((m) => m.status === "active").length}`}
        title="Members"
        actions={
          <>
            <Pill href="/api/admin/members/export" target="_blank">Export CSV</Pill>
            <Pill href="/admin/members?invite=1">Invite member</Pill>
            <Pill href="/admin/members?invite=1" tone="blue">Add member</Pill>
          </>
        }
      />
      <MembersList rows={rows} invites={invites.map((i) => ({ email: i.email, name: i.name, teams: i.teams, role: i.role }))} initialTeam={team ?? ""} showInvite={invite === "1"} requireApproval={config.requireApproval} />
    </div>
  );
}
