import { NextResponse } from "next/server";
import { staffRoute } from "@/lib/admin/route";
import { getAllMembers } from "@/lib/firebase/members";
import { getAllApplications, getAllEvents } from "@/lib/firebase/portal";
import { teamShort } from "@/lib/models/Member";
import { csv } from "@/lib/utils/csv";
import { fmtDateYear } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const GET = staffRoute(async () => {
  const [members, apps, events] = await Promise.all([getAllMembers(), getAllApplications(), getAllEvents()]);
  const counting = events.filter((e) => e.status === "published" && e.countsForAttendance);
  const header = ["Name", "Email", "UT EID", "Phone", "Major", "Second major", "Graduation", "LinkedIn", "Role", "Status", "Teams", "Member since", "Applications", "Placed", "Events attended", "Resumes", "Default resume"];
  const rows = members.map((m) => {
    const mine = apps.filter((a) => a.userId === m.uid);
    return [
      m.name, m.email, m.eid, m.phone, m.major, m.major2, m.gradDate, m.linkedin, m.role, m.status, m.teams.map(teamShort).join("; "),
      fmtDateYear(m.memberSince), mine.length, mine.filter((a) => a.status === "placed").length,
      counting.filter((e) => e.attendedUids.includes(m.uid)).length, m.resumes.length, m.resumes.find((r) => r.isDefault)?.url ?? "",
    ];
  });
  return new NextResponse(csv([header, ...rows]), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="txa-members.csv"' },
  });
});
