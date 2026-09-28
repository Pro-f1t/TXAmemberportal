import { NextResponse } from "next/server";
import { requireUser, guardErrorStatus } from "@/lib/auth/guard";
import { updateMember, MemberPatch } from "@/lib/firebase/members";
import { isTeam } from "@/lib/models/Member";
import { str } from "@/lib/firebase/fs";

/** A member edits their own profile. Role/status/email are never touched here. */
export async function PATCH(request: Request) {
  try {
    const { uid } = await requireUser();
    const body = await request.json();
    const patch: MemberPatch = {};
    if ("firstName" in body) patch.firstName = str(body.firstName, 80).trim();
    if ("lastName" in body) patch.lastName = str(body.lastName, 80).trim();
    if (patch.firstName !== undefined || patch.lastName !== undefined) {
      // Keep the display name in sync when either half changes.
      const first = patch.firstName ?? "";
      const last = patch.lastName ?? "";
      if (first || last) patch.name = `${first} ${last}`.trim();
    }
    if ("phone" in body) patch.phone = str(body.phone, 40).trim();
    if ("eid" in body) patch.eid = str(body.eid, 20).trim();
    if ("linkedin" in body) patch.linkedin = str(body.linkedin, 200).trim();
    if ("major" in body) patch.major = str(body.major, 120).trim();
    if ("major2" in body) patch.major2 = str(body.major2, 120).trim();
    if ("gradDate" in body) patch.gradDate = str(body.gradDate, 40).trim();
    if ("photoUrl" in body) patch.photoUrl = str(body.photoUrl, 2000).trim();
    // Field teams are exec-assigned (member detail in the console); members can't set their own.
    await updateMember(uid, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = guardErrorStatus(error);
    if (status) return NextResponse.json({ error: "Not signed in" }, { status });
    return NextResponse.json({ error: "Could not save profile." }, { status: 500 });
  }
}
