import { NextResponse } from "next/server";
import { requireUser, guardErrorStatus } from "@/lib/auth/guard";
import { setMemberResumes } from "@/lib/firebase/members";
import { Resume, MAX_RESUMES, isTeam } from "@/lib/models/Member";
import { newId, str } from "@/lib/firebase/fs";

function fail(error: unknown) {
  const status = guardErrorStatus(error);
  if (status) return NextResponse.json({ error: "Not signed in" }, { status });
  return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed." }, { status: 400 });
}

/** Invariant: exactly one default when any resume exists. */
function normalise(resumes: Resume[]): Resume[] {
  if (resumes.length && !resumes.some((r) => r.isDefault)) resumes[0].isDefault = true;
  let seen = false;
  for (const r of resumes) {
    if (r.isDefault && seen) r.isDefault = false;
    if (r.isDefault) seen = true;
  }
  return resumes;
}

/** Register an uploaded PDF (the file itself went straight to Storage). */
export async function POST(request: Request) {
  try {
    const { member } = await requireUser();
    const body = await request.json();
    const url = str(body.url, 2000).trim();
    const fileName = str(body.fileName, 200).trim() || "resume.pdf";
    const size = Number(body.size) || 0;
    if (!url) throw new Error("Missing file.");
    if (member.resumes.length >= MAX_RESUMES) throw new Error(`You can keep up to ${MAX_RESUMES} resumes. Delete one first.`);
    const resumes = normalise([
      ...member.resumes,
      { id: newId(), fileName, url, size, uploadedAt: new Date(), assignedTeams: [], isDefault: member.resumes.length === 0 },
    ]);
    await setMemberResumes(member.uid, resumes);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

/** toggleTeam: assign/unassign a team (a team lives on at most one resume). setDefault. */
export async function PATCH(request: Request) {
  try {
    const { member } = await requireUser();
    const body = await request.json();
    const id = str(body.id, 40);
    const target = member.resumes.find((r) => r.id === id);
    if (!target) throw new Error("Resume not found.");
    let resumes = member.resumes.map((r) => ({ ...r, assignedTeams: [...r.assignedTeams] }));
    if (body.action === "toggleTeam") {
      const team = body.team;
      if (!isTeam(team)) throw new Error("Unknown team.");
      const has = target.assignedTeams.includes(team);
      resumes = resumes.map((r) => ({ ...r, assignedTeams: r.assignedTeams.filter((t) => t !== team) }));
      if (!has) resumes.find((r) => r.id === id)!.assignedTeams.push(team);
    } else if (body.action === "setDefault") {
      resumes = resumes.map((r) => ({ ...r, isDefault: r.id === id }));
    } else {
      throw new Error("Unknown action.");
    }
    await setMemberResumes(member.uid, normalise(resumes));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { member } = await requireUser();
    const body = await request.json();
    const id = str(body.id, 40);
    if (!member.resumes.some((r) => r.id === id)) throw new Error("Resume not found.");
    // The Storage object is left in place: applications already sent may still
    // reference its URL. Paths carry a uid + timestamp, so nothing collides.
    await setMemberResumes(member.uid, normalise(member.resumes.filter((r) => r.id !== id)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
