import { NextResponse } from "next/server";
import { staffRoute } from "@/lib/admin/route";
import { getAllMembers } from "@/lib/firebase/members";
import { TEAMS, Team, teamShort, resumeForTeam, STAFF_ROLES } from "@/lib/models/Member";
import { csv } from "@/lib/utils/csv";
import { fmtDateYear } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/** The resume book as CSV: name, contact, teams, and the resolved resume link. */
export const GET = staffRoute(async ({ request }) => {
  const url = new URL(request.url);
  const teamParam = url.searchParams.get("team");
  const team = TEAMS.includes(teamParam as Team) ? (teamParam as Team) : null;
  const members = (await getAllMembers()).filter((m) => m.status === "active" && !STAFF_ROLES.includes(m.role) && (!team || m.teams.includes(team)));
  const header = ["Name", "Email", "Major", "Graduation", "LinkedIn", "Teams", "Resume", "Resume kind", "Uploaded", "Link"];
  const rows = members.map((m) => {
    const r = resumeForTeam(m, team);
    return [m.name, m.email, m.major, m.gradDate, m.linkedin, m.teams.map(teamShort).join("; "), r?.fileName ?? "", !r ? "missing" : team && r.assignedTeams.includes(team) ? "team" : "default", r ? fmtDateYear(r.uploadedAt) : "", r?.url ?? ""];
  });
  const name = team ? `txa-resumes-${teamShort(team).toLowerCase().replace(/[^a-z]+/g, "-")}.csv` : "txa-resumes.csv";
  return new NextResponse(csv([header, ...rows]), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
});
